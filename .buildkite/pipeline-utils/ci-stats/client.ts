/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Method, AxiosRequestConfig } from 'axios';
import axios from 'axios';

export interface CiStatsClientConfig {
  baseUrl?: string;
  token?: string;
}

export interface CiStatsBuild {
  id: string;
}

export interface CiStatsPrReport {
  md: string;
  success: boolean;
}

export interface CompleteSuccessBuildSource {
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

export interface TestGroupRunOrderResponse {
  sources: unknown;
  types: Array<{
    type: string;
    count: number;
    queue?: string;
    groups: Array<{
      durationMin: number;
      names: string[];
    }>;
    tooLong?: Array<{ config: string; durationMin: number }>;
    namesWithoutDurations: string[];
  }>;
}

interface RequestOptions {
  path: string;
  method?: Method;
  params?: AxiosRequestConfig['params'];
  body?: AxiosRequestConfig['data'];
  maxAttempts?: number;
}

export class CiStatsClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: CiStatsClientConfig = {}) {
    const CI_STATS_HOST = config.baseUrl ?? process.env.CI_STATS_HOST;
    const CI_STATS_TOKEN = config.token ?? process.env.CI_STATS_TOKEN;

    this.baseUrl = `https://${CI_STATS_HOST}`;
    this.defaultHeaders = {
      Authorization: `token ${CI_STATS_TOKEN}`,
    };
  }

  createBuild = async () => {
    const resp = await this.request<CiStatsBuild>({
      method: 'POST',
      path: '/v1/build',
      body: {
        jenkinsJobName: process.env.BUILDKITE_PIPELINE_SLUG,
        jenkinsJobId: process.env.BUILDKITE_BUILD_NUMBER,
        jenkinsUrl: process.env.BUILDKITE_BUILD_URL,
        prId: process.env.GITHUB_PR_NUMBER || null,
        backfillJobIds: process.env.KIBANA_REUSABLE_BUILD_JOB_ID
          ? [process.env.KIBANA_REUSABLE_BUILD_JOB_ID]
          : [],
      },
    });

    return resp.data;
  };

  addGitInfo = async (buildId: string) => {
    await this.request({
      method: 'POST',
      path: '/v1/git_info',
      params: {
        buildId,
      },
      body: {
        branch: (process.env.BUILDKITE_BRANCH || '').replace(/^(refs\/heads\/|origin\/)/, ''),
        commit: process.env.BUILDKITE_COMMIT,
        targetBranch:
          process.env.GITHUB_PR_TARGET_BRANCH ||
          process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH ||
          null,
        mergeBase: process.env.GITHUB_PR_MERGE_BASE || null,
      },
    });
  };

  markBuildAsValidBaseline = async (buildId: string) => {
    await this.request({
      method: 'POST',
      path: `/v1/build/_is_valid_baseline`,
      params: {
        id: buildId,
      },
    });
  };

  completeBuild = async (buildStatus: string, buildId: string) => {
    await this.request({
      method: 'POST',
      path: `/v1/build/_complete`,
      params: {
        id: buildId,
      },
      body: {
        result: buildStatus,
      },
    });
  };

  getPrReport = async (buildId: string) => {
    const resp = await this.request<CiStatsPrReport>({
      method: 'GET',
      path: `v2/pr_report`,
      params: {
        buildId,
      },
    });

    return resp.data;
  };

  pickTestGroupRunOrder = async (body: {
    sources: Array<
      | {
          branch: string;
          jobName: string;
        }
      | {
          prId: string;
          jobName: string;
        }
      | {
          commit: string;
          jobName: string;
        }
    >;
    durationPercentile?: number;
    groups: Array<{
      type: string;
      queue?: string;
      defaultMin?: number;
      maxMin: number;
      minimumIsolationMin?: number;
      overheadMin?: number;
      concurrency?: number;
      names: string[];
    }>;
  }) => {
    console.log('requesting test group run order from ci-stats:');
    console.log(JSON.stringify(body, null, 2));

    const resp = await axios.request<TestGroupRunOrderResponse>({
      method: 'POST',
      baseURL: this.baseUrl,
      headers: this.defaultHeaders,
      url: '/v2/_pick_test_group_run_order',
      data: body,
    });

    return resp.data;
  };

  private async request<T>({ method, path, params, body, maxAttempts = 3 }: RequestOptions) {
    let attempt = 0;

    while (true) {
      attempt += 1;
      try {
        return await axios.request<T>({
          method,
          baseURL: this.baseUrl,
          url: path,
          params,
          data: body,
          headers: this.defaultHeaders,
        });
      } catch (error) {
        console.error('CI Stats request error:', error?.response?.data?.message);

        if (attempt < maxAttempts) {
          const sec = attempt * 3;
          console.log('waiting', sec, 'seconds before retrying');
          await new Promise((resolve) => setTimeout(resolve, sec * 1000));
          continue;
        }

        throw new Error('Failed to connect to CI Stats.');
      }
    }
  }
}
