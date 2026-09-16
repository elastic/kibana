/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { parseDuration } from '../../../../utils/parse-duration/parse-duration';

const DEFAULT_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface DataStreamMetadata {
  retentionTime: string | undefined;
  backingIndexes: string[];
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
      return retentionMs / 30;
    }
  } catch {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  return DEFAULT_REFRESH_INTERVAL_MS;
};

/**
 * One instance per data-stream name. start() loads metadata once; each fetch
 * then schedules the next refresh with setTimeout so getMeta() never waits on ES.
 */
export class DataStreamMetadataManager {
  private static readonly byName = new Map<string, DataStreamMetadataManager>();

  static getOrCreate(deps: DataStreamMetadataManagerDeps): DataStreamMetadataManager {
    const existing = DataStreamMetadataManager.byName.get(deps.dataStreamName);
    if (existing) {
      return existing;
    }

    const created = new DataStreamMetadataManager(deps);
    DataStreamMetadataManager.byName.set(deps.dataStreamName, created);
    return created;
  }

  private metadata: DataStreamMetadata | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private startPromise: Promise<void> | undefined;
  private stopped = false;

  private constructor(private readonly deps: DataStreamMetadataManagerDeps) {}

  async start(): Promise<void> {
    this.stopped = false;
    if (!this.startPromise) {
      this.startPromise = this.loadAndSchedule();
    }
    return this.startPromise;
  }

  getMeta(): DataStreamMetadata {
    if (!this.metadata) {
      throw new Error(
        `Data stream metadata for ${this.deps.dataStreamName} is not loaded. Call start() first.`
      );
    }
    return this.metadata;
  }

  stop(): void {
    this.stopped = true;
    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.startPromise = undefined;
    DataStreamMetadataManager.byName.delete(this.deps.dataStreamName);
  }

  private async loadAndSchedule(): Promise<void> {
    this.metadata = await this.fetchMetadata();
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
    if (this.stopped) {
      return;
    }

    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      void this.refreshInBackground();
    }, computeRefreshIntervalMs(this.metadata?.retentionTime));
  }

  private async fetchMetadata(): Promise<DataStreamMetadata> {
    const { data_streams: dataStreams } = await this.deps.esClient.indices.getDataStream({
      name: this.deps.dataStreamName,
    });
    const dataStream = dataStreams[0];

    const retentionTime = dataStream?.lifecycle?.data_retention as string | undefined;
    const backingIndexes = (dataStream?.indices ?? []).map((idx) => idx.index_name);
    return { retentionTime, backingIndexes };
  }
}
