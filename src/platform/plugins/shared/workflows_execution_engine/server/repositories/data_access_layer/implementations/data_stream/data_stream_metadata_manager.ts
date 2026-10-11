/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { parseDuration } from '@kbn/workflows';

const DEFAULT_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const INITIAL_RETRY_INTERVAL_MS = 5 * 1000;
const MIN_REFRESH_INTERVAL_MS = 1000;

export interface DataStreamMetadata {
  retentionTime: string | undefined;
  backingIndexes: string[];
  writableIndex: string;
}

export interface DataStreamMetadataManagerDeps {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  logger: Logger;
}

const computeRefreshIntervalMs = (retentionTime: string | undefined): number => {
  if (!retentionTime) {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  try {
    const retentionMs = parseDuration(retentionTime);
    if (retentionMs < THIRTY_DAYS_MS) {
      return Math.max(retentionMs / 30, MIN_REFRESH_INTERVAL_MS);
    }
  } catch {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  return DEFAULT_REFRESH_INTERVAL_MS;
};

/**
 * Loads data-stream backing-index metadata on init(); each fetch then schedules
 * the next refresh with setTimeout so getMeta() never waits on ES.
 */
export class DataStreamMetadataManager {
  private metadata: DataStreamMetadata | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private initPromise: Promise<void> | undefined;
  private disposed = false;

  constructor(private readonly deps: DataStreamMetadataManagerDeps) {}

  async init(): Promise<void> {
    this.disposed = false;
    if (!this.initPromise) {
      this.initPromise = this.loadAndSchedule();
    }
    return this.initPromise;
  }

  getMeta(): DataStreamMetadata {
    if (!this.metadata) {
      throw new Error(
        `Data stream metadata for ${this.deps.dataStreamName} is not loaded. Call init() first.`
      );
    }
    return this.metadata;
  }

  dispose(): void {
    this.disposed = true;
    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.initPromise = undefined;
  }

  // A failed first load must not abort plugin start: log it and keep retrying in the background.
  private async loadAndSchedule(): Promise<void> {
    try {
      this.metadata = await this.fetchMetadata();
    } catch (error) {
      this.deps.logger.warn(
        `Failed to load data stream metadata for ${this.deps.dataStreamName}, will retry: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    this.scheduleNextRefresh();
  }

  private async refreshInBackground(): Promise<void> {
    try {
      this.metadata = await this.fetchMetadata();
    } catch (error) {
      this.deps.logger.warn(
        `Failed to refresh data stream metadata for ${this.deps.dataStreamName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    this.scheduleNextRefresh();
  }

  private scheduleNextRefresh(): void {
    if (this.disposed) {
      return;
    }

    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
    }

    const intervalMs = this.metadata
      ? computeRefreshIntervalMs(this.metadata.retentionTime)
      : INITIAL_RETRY_INTERVAL_MS;

    this.refreshTimer = setTimeout(() => {
      void this.refreshInBackground();
    }, intervalMs);
  }

  private async fetchMetadata(): Promise<DataStreamMetadata> {
    const { data_streams: dataStreams } = await this.deps.esClient.indices.getDataStream({
      name: this.deps.dataStreamName,
    });
    const dataStream = dataStreams[0];

    const retentionTime = dataStream?.lifecycle?.data_retention as string | undefined;
    const backingIndexes = (dataStream?.indices ?? []).map((idx) => idx.index_name);
    const writableIndex = backingIndexes.at(-1);
    if (!writableIndex) {
      throw new Error(`Data stream ${this.deps.dataStreamName} has no backing indexes`);
    }

    return { retentionTime, backingIndexes, writableIndex };
  }
}
