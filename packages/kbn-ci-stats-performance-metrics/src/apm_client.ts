/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { getYearAgoIso } from './utils';

type Environment = 'ENVIRONMENT_ALL' | 'ci' | 'development';
type LatencyAggregationType = 'avg' | 'p95' | 'p99';
type TransactionType = 'page-load' | 'app-change' | 'user-interaction' | 'http-request';

interface MainStatisticsRequestOptions {
  ciBuildId: string;
  start?: string;
  end?: string;
  environment?: Environment;
  transactionType?: TransactionType;
  latencyAggregationType?: LatencyAggregationType;
}

export interface TransactionGroup {
  name: string;
  latency: number;
  throughput: number;
  errorRate?: any;
  impact: number;
  transactionType: TransactionType;
}

export interface MainStatisticsResponse {
  transactionGroups: TransactionGroup[];
  isAggregationAccurate: boolean;
  bucketSize: number;
}

interface ApmClientConfig {
  baseURL?: string;
  timeout?: number;
  auth?: {
    username: string;
    password: string;
  };
}

const DEFAULT_BASE_URL =
  'https://kibana-ops-e2e-perf.kb.us-central1.gcp.cloud.es.io:9243/internal/apm';
const DEFAULT_CLIENT_TIMEOUT = 120 * 1000;

export class ApmClient {
  private readonly _baseURL: string;
  private readonly _timeout: number;
  private readonly _authHeader: string | undefined;
  private readonly logger: ToolingLog;

  constructor(config: ApmClientConfig, logger: ToolingLog) {
    const { baseURL = DEFAULT_BASE_URL, timeout = DEFAULT_CLIENT_TIMEOUT, auth } = config;

    this._baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    this._timeout = timeout;
    this._authHeader = auth
      ? `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
      : undefined;

    this.logger = logger || console;
  }

  public get baseUrl(): string {
    return this._baseURL;
  }

  public async mainStatistics(queryParams: MainStatisticsRequestOptions) {
    const { now, yearAgo } = getYearAgoIso();

    const {
      ciBuildId,
      start = yearAgo,
      end = now,
      environment = 'ENVIRONMENT_ALL',
      transactionType = 'page-load',
      latencyAggregationType = 'avg',
    } = queryParams;

    try {
      const searchParams = new URLSearchParams({
        kuery: `labels.ciBuildId:${ciBuildId}`,
        environment,
        start,
        end,
        transactionType,
        latencyAggregationType,
      });

      const url = `${
        this._baseURL
      }/services/kibana-frontend/transactions/groups/main_statistics?${searchParams.toString()}`;
      const headers: Record<string, string> = {};
      if (this._authHeader) {
        headers.Authorization = this._authHeader;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this._timeout),
      });

      if (!response.ok) {
        throw new Error(
          `APM request failed with status ${response.status}: ${response.statusText}`
        );
      }

      return (await response.json()) as MainStatisticsResponse;
    } catch (error) {
      this.logger.error(
        `Error fetching main statistics from APM, ci build ${ciBuildId}, error message ${error.message}`
      );
    }
  }
}
