/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Axios from 'axios';
import { ToolingLog } from '../tooling_log';

import { parseConfig, Config } from './ci_stats_config';
import { CiStatsMetadata } from './ci_stats_metadata';

interface LatestTestGroupStatsOptions {
  /** The Kibana branch to get stats for, eg "main" */
  branch: string;
  /** The CI job names to filter builds by, eg "kibana-hourly" */
  ciJobNames: string[];
  /** Filter test groups by group type */
  testGroupType?: string;
}

interface CompleteSuccessBuildSource {
  jobName: string;
  jobRunner: string;
  completedAt: string;
  commit: string;
  startedAt: string;
  branch: string;
  result: 'SUCCESS';
  jobId: string;
  targetBranch: string | null;
  fromKibanaCiProduction: boolean;
  requiresValidMetrics: boolean | null;
  jobUrl: string;
  mergeBase: string | null;
}

interface TestGroupSource {
  '@timestamp': string;
  buildId: string;
  name: string;
  type: string;
  startTime: string;
  durationMs: number;
  meta: CiStatsMetadata;
}

interface LatestTestGroupStatsResp {
  build: CompleteSuccessBuildSource & { id: string };
  testGroups: Array<TestGroupSource & { id: string }>;
}

export class CiStatsClient {
  /**
   * Create a CiStatsReporter by inspecting the ENV for the necessary config
   */
  static fromEnv(log: ToolingLog) {
    return new CiStatsClient(parseConfig(log));
  }

  constructor(private readonly config?: Config) {}

  isEnabled() {
    return !!this.config?.apiToken;
  }

  async getLatestTestGroupStats(options: LatestTestGroupStatsOptions) {
    if (!this.config || !this.config.apiToken) {
      throw new Error('No ciStats config available, call `isEnabled()` before using the client');
    }

    const resp = await Axios.request<LatestTestGroupStatsResp>({
      baseURL: 'https://ci-stats.kibana.dev',
      url: '/v1/test_group_stats',
      params: {
        branch: options.branch,
        ci_job_name: options.ciJobNames.join(','),
        test_group_type: options.testGroupType,
      },
      headers: {
        Authentication: `token ${this.config.apiToken}`,
      },
    });

    return resp.data;
  }
}
