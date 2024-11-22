/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ToolingLog } from '@kbn/tooling-log';
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

const DEFAULT_BASE_URL =
  'https://kibana-ops-e2e-perf.kb.us-central1.gcp.cloud.es.io:9243/internal/apm';
const DEFAULT_CLIENT_TIMEOUT = 120 * 1000;

export class ApmClient {
  private readonly client: AxiosInstance;
  private readonly logger: ToolingLog;

  constructor(config: AxiosRequestConfig, logger: ToolingLog) {
    const { baseURL = DEFAULT_BASE_URL, timeout = DEFAULT_CLIENT_TIMEOUT, auth } = config;

    this.client = axios.create({
      auth,
      baseURL,
      timeout,
    });

    this.logger = logger || console;
  }

  public get baseUrl(): string | undefined {
    return this.client.defaults.baseURL;
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
      const responseRaw = await this.client.get<MainStatisticsResponse>(
        `services/kibana-frontend/transactions/groups/main_statistics`,
        {
          params: {
            kuery: `labels.ciBuildId:${ciBuildId}`,
            environment,
            start,
            end,
            transactionType,
            latencyAggregationType,
          },
        }
      );
      return responseRaw.data;
    } catch (error) {
      this.logger.error(
        `Error fetching main statistics from APM, ci build ${ciBuildId}, error message ${error.message}`
      );
    }
  }
}
