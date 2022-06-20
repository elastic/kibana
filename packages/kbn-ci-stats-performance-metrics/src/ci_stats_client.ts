/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const DEFAULT_BASE_URL = 'https://ci-stats.kibana.dev';
const DEFAULT_CLIENT_TIMEOUT = 120 * 1000;

interface PerformanceMetrics {
  [key: string]: number;
}

export class CiStatsClient {
  private readonly client: AxiosInstance;
  private readonly logger: ToolingLog;

  constructor(config: AxiosRequestConfig, logger: ToolingLog) {
    const { baseURL = DEFAULT_BASE_URL, timeout = DEFAULT_CLIENT_TIMEOUT } = config;

    this.client = axios.create({
      auth: config.auth,
      baseURL,
      timeout,
    });

    this.logger = logger || console;
  }

  public async postPerformanceMetricsReports(
    buildId: string,
    jobUrl: string,
    metrics: PerformanceMetrics
  ) {
    const url = '/v1/performance_metrics_report';

    try {
      await this.client.post(url, { jobUrl, metrics }, { params: { buildId } });
    } catch (error) {
      this.logger.error(
        `Error posting performance metrics to ci-stats, ci build ${buildId}, error message ${error.message}`
      );
    }
  }
}
