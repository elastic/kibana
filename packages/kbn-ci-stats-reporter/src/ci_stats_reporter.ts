/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import Os from 'os';
import Fs from 'fs';
import Path from 'path';
import crypto from 'crypto';

import execa from 'execa';
import Axios, { AxiosRequestConfig } from 'axios';
import { REPO_ROOT, kibanaPackageJson } from '@kbn/repo-info';
import { parseConfig, Config, CiStatsMetadata } from '@kbn/ci-stats-core';
import type { SomeDevLog } from '@kbn/some-dev-log';

// @ts-expect-error not "public", but necessary to prevent Jest shimming from breaking things
import httpAdapter from 'axios/lib/adapters/http';

import type { CiStatsTestGroupInfo, CiStatsTestRun } from './ci_stats_test_group_types';

const BASE_URL = 'https://ci-stats.kibana.dev';
const SECOND = 1000;
const MINUTE = 60 * SECOND;

function limitMetaStrings(meta: CiStatsMetadata) {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (typeof value === 'string' && value.length > 2000) {
        return [key, value.slice(0, 2000)];
      }

      return [key, value];
    })
  );
}

/** A ci-stats metric record */
export interface CiStatsMetric {
  /** Top-level categorization for the metric, e.g. "page load bundle size" */
  group: string;
  /** Specific sub-set of the "group", e.g. "dashboard" */
  id: string;
  /** integer value recorded as the value of this metric */
  value: number;
  /** optional limit which will generate an error on PRs when the metric exceeds the limit */
  limit?: number;
  /**
   * path, relative to the repo, where the config file containing limits
   * is kept. Linked from PR comments instructing contributors how to fix
   * their PRs.
   */
  limitConfigPath?: string;
  /** Arbitrary key-value pairs which can be used for additional filtering/reporting */
  meta?: CiStatsMetadata;
}

export type PerformanceMetrics = Record<string, number>;

/** A ci-stats timing event */
export interface CiStatsTiming {
  /** Top-level categorization for the timing, e.g. "scripts/foo", process type, etc. */
  group: string;
  /** Specific timing (witin the "group" being tracked) e.g. "total" */
  id: string;
  /** time in milliseconds which should be recorded */
  ms: number;
  /** hash of key-value pairs which will be stored with the timing for additional filtering and reporting */
  meta?: CiStatsMetadata;
}

/** Options for reporting timings to ci-stats */
export interface TimingsOptions {
  /** list of timings to record */
  timings: CiStatsTiming[];
  /** master, 7.x, etc, automatically detected from package.json if not specified */
  upstreamBranch?: string;
  /** value of data/uuid, automatically loaded if not specified */
  kibanaUuid?: string | null;
}

/** Options for reporting metrics to ci-stats */
export interface MetricsOptions {
  /** Default metadata to add to each metric */
  defaultMeta?: CiStatsMetadata;
}

/** Options for reporting tests to ci-stats */
export interface CiStatsReportTestsOptions {
  /**
   * Information about the group of tests that were run
   */
  group: CiStatsTestGroupInfo;
  /**
   * Information about each test that ran, including failure information
   */
  testRuns: CiStatsTestRun[];
}

/* @internal */
interface ReportTestGroupResponse {
  groupId: string;
}

/* @internal */
interface ReqOptions {
  auth: boolean;
  path: string;
  body: any;
  bodyDesc: string;
  query?: AxiosRequestConfig['params'];
  timeout?: number;
}

/** Object that helps report data to the ci-stats service */
export class CiStatsReporter {
  /**
   * Create a CiStatsReporter by inspecting the ENV for the necessary config
   */
  static fromEnv(log: SomeDevLog) {
    return new CiStatsReporter(parseConfig(log), log);
  }

  constructor(private readonly config: Config | undefined, private readonly log: SomeDevLog) {}

  /**
   * Determine if CI_STATS is explicitly disabled by the environment. To determine
   * if the CiStatsReporter has enough information in the environment to send metrics
   * for builds use #hasBuildConfig().
   */
  isEnabled() {
    return process.env.CI_STATS_DISABLED !== 'true';
  }

  /**
   * Determines if the CiStatsReporter is disabled by the environment, or properly
   * configured and able to send stats
   */
  hasBuildConfig() {
    return this.isEnabled() && !!this.config?.apiToken && !!this.config?.buildId;
  }

  /**
   * Report timings data to the ci-stats service. If running in CI then the reporter
   * will include the buildId in the report with the access token, otherwise the timings
   * data will be recorded as anonymous timing data.
   */
  async timings(options: TimingsOptions) {
    if (!this.isEnabled()) {
      return;
    }

    const buildId = this.config?.buildId;
    const timings = options.timings.map((timing) =>
      timing.meta
        ? {
            ...timing,
            meta: limitMetaStrings(timing.meta),
          }
        : timing
    );
    const upstreamBranch = options.upstreamBranch ?? this.getUpstreamBranch();
    const kibanaUuid = options.kibanaUuid === undefined ? this.getKibanaUuid() : options.kibanaUuid;
    let email;
    let branch;

    try {
      const { stdout } = await execa('git', ['config', 'user.email']);
      email = stdout;
    } catch (e) {
      this.log.debug(e.message);
    }

    try {
      const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
      branch = stdout;
    } catch (e) {
      this.log.debug(e.message);
    }

    const memUsage = process.memoryUsage();
    const isElasticCommitter = email && email.endsWith('@elastic.co') ? true : false;

    const defaultMeta = {
      kibanaUuid,
      isElasticCommitter,
      committerHash: email
        ? crypto.createHash('sha256').update(email).digest('hex').substring(0, 20)
        : undefined,
      email: isElasticCommitter ? email : undefined,
      branch: isElasticCommitter ? branch : undefined,
      cpuCount: Os.cpus()?.length,
      cpuModel: Os.cpus()[0]?.model,
      cpuSpeed: Os.cpus()[0]?.speed,
      freeMem: Os.freemem(),
      memoryUsageRss: memUsage.rss,
      memoryUsageHeapTotal: memUsage.heapTotal,
      memoryUsageHeapUsed: memUsage.heapUsed,
      memoryUsageExternal: memUsage.external,
      memoryUsageArrayBuffers: memUsage.arrayBuffers,
      nestedTiming: process.env.CI_STATS_NESTED_TIMING ? true : false,
      osArch: Os.arch(),
      osPlatform: Os.platform(),
      osRelease: Os.release(),
      totalMem: Os.totalmem(),
    };

    this.log.debug('CIStatsReporter committerHash: %s', defaultMeta.committerHash);

    return !!(await this.req({
      auth: !!buildId,
      path: '/v1/timings',
      body: {
        buildId,
        upstreamBranch,
        defaultMeta,
        timings,
      },
      bodyDesc: timings.length === 1 ? `${timings.length} timing` : `${timings.length} timings`,
    }));
  }

  /**
   * Report metrics data to the ci-stats service. If running outside of CI this method
   * does nothing as metrics can only be reported when associated with a specific CI build.
   */
  async metrics(metrics: CiStatsMetric[], options?: MetricsOptions) {
    if (!this.hasBuildConfig()) {
      return;
    }

    const buildId = this.config?.buildId;
    if (!buildId) {
      throw new Error(`metrics can't be reported without a buildId`);
    }

    return !!(await this.req({
      auth: true,
      path: '/v1/metrics',
      body: {
        buildId,
        defaultMeta: options?.defaultMeta,
        buildkiteJobId: process.env.BUILDKITE_JOB_ID,
        metrics,
      },
      bodyDesc: `metrics: ${metrics
        .map(({ group, id, value }) => `[${group}/${id}=${value}]`)
        .join(' ')}`,
    }));
  }

  /**
   * Send test reports to ci-stats
   */
  async reportTests({ group, testRuns }: CiStatsReportTestsOptions) {
    if (!this.config?.buildId || !this.config?.apiToken) {
      throw new Error(
        'unable to report tests unless buildId is configured and auth config available'
      );
    }

    const groupResp = await this.req<ReportTestGroupResponse>({
      auth: true,
      path: '/v2/test_group',
      query: {
        buildId: this.config?.buildId,
      },
      bodyDesc: `[${group.name}/${group.type}] test group`,
      body: group,
    });

    if (!groupResp) {
      return;
    }

    let bufferBytes = 0;
    const buffer: string[] = [];
    const flushBuffer = async () => {
      await this.req<{ testRunCount: number }>({
        auth: true,
        path: '/v2/test_runs',
        query: {
          buildId: this.config?.buildId,
          groupId: groupResp.groupId,
          groupType: group.type,
        },
        bodyDesc: `[${group.name}/${group.type}] Chunk of ${bufferBytes} bytes`,
        body: buffer.join('\n'),
        timeout: 5 * MINUTE,
      });
      buffer.length = 0;
      bufferBytes = 0;
    };

    // send test runs in chunks of ~500kb
    for (const testRun of testRuns) {
      const json = JSON.stringify(testRun);
      bufferBytes += json.length;
      buffer.push(json);
      if (bufferBytes >= 450000) {
        await flushBuffer();
      }
    }

    if (bufferBytes) {
      await flushBuffer();
    }
  }

  async reportPerformanceMetrics(metrics: PerformanceMetrics) {
    if (!this.hasBuildConfig()) {
      return;
    }

    const buildId = this.config?.buildId;
    if (!buildId) {
      throw new Error(`Performance metrics can't be reported without a buildId`);
    }

    return !!(await this.req({
      auth: true,
      path: `/v1/performance_metrics_report?buildId=${buildId}`,
      body: { metrics },
      bodyDesc: `performance metrics: ${metrics}`,
    }));
  }

  /**
   * In order to allow this code to run before @kbn/utils is built
   */
  private getUpstreamBranch() {
    return kibanaPackageJson.branch;
  }

  /**
   * In order to allow this code to run before @kbn/utils is built
   */
  private getKibanaUuid() {
    try {
      return Fs.readFileSync(Path.resolve(REPO_ROOT, 'data/uuid'), 'utf-8').trim();
    } catch (error) {
      if (error.code === 'ENOENT') {
        return undefined;
      }

      throw error;
    }
  }

  private async req<T>({ auth, body, bodyDesc, path, query, timeout = 60 * SECOND }: ReqOptions) {
    let attempt = 0;
    const maxAttempts = 5;

    let headers;
    if (auth && this.config) {
      headers = {
        Authorization: `token ${this.config.apiToken}`,
      };
    } else if (auth) {
      throw new Error('this.req() shouldnt be called with auth=true if this.config is not defined');
    }

    while (true) {
      attempt += 1;

      try {
        const resp = await Axios.request<T>({
          method: 'POST',
          url: path,
          baseURL: BASE_URL,
          headers,
          data: body,
          params: query,
          adapter: httpAdapter,

          // if it can be serialized into a string, send it
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout,
        });

        return resp.data;
      } catch (error) {
        if (!error?.request) {
          // not an axios error, must be a usage error that we should notify user about
          throw error;
        }

        if (error?.response && error.response.status < 500) {
          // error response from service was received so warn the user and move on
          this.log.warning(
            `error reporting ${bodyDesc} [status=${error.response.status}] [resp=${inspect(
              error.response.data
            )}]`
          );
          return;
        }

        if (attempt === maxAttempts) {
          this.log.warning(
            `unable to report ${bodyDesc}, failed to reach ci-stats service too many times`
          );
          return;
        }

        // we failed to reach the backend and we have remaining attempts, lets retry after a short delay
        const reason = error?.response?.status
          ? `${error.response.status} response`
          : 'no response';

        const seconds = attempt * 10;
        this.log.warning(
          `failed to reach ci-stats service, retrying in ${seconds} seconds, [reason=${reason}], [error=${error.message}]`
        );

        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      }
    }
  }
}
