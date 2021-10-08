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
import Axios from 'axios';

import { ToolingLog } from '../tooling_log';
import { parseConfig, Config } from './ci_stats_config';

const BASE_URL = 'https://ci-stats.kibana.dev';

export interface CiStatsMetric {
  group: string;
  id: string;
  value: number;
  limit?: number;
  limitConfigPath?: string;
}

export interface CiStatsTimingMetadata {
  [key: string]: string | string[] | number | boolean | undefined;
}
export interface CiStatsTiming {
  group: string;
  id: string;
  ms: number;
  meta?: CiStatsTimingMetadata;
}

export interface ReqOptions {
  auth: boolean;
  path: string;
  body: any;
  bodyDesc: string;
}

export interface TimingsOptions {
  /** list of timings to record */
  timings: CiStatsTiming[];
  /** master, 7.x, etc, automatically detected from package.json if not specified */
  upstreamBranch?: string;
  /** value of data/uuid, automatically loaded if not specified */
  kibanaUuid?: string | null;
}
export class CiStatsReporter {
  static fromEnv(log: ToolingLog) {
    return new CiStatsReporter(parseConfig(log), log);
  }

  constructor(private config: Config | undefined, private log: ToolingLog) {}

  isEnabled() {
    return process.env.CI_STATS_DISABLED !== 'true';
  }

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
    const timings = options.timings;
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
      const { stdout } = await execa('git', ['branch', '--show-current']);
      branch = stdout;
    } catch (e) {
      this.log.debug(e.message);
    }

    const memUsage = process.memoryUsage();
    const isElasticCommitter = email && email.endsWith('@elastic.co') ? true : false;

    const defaultMetadata = {
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

    this.log.debug('CIStatsReporter committerHash: %s', defaultMetadata.committerHash);

    return await this.req({
      auth: !!buildId,
      path: '/v1/timings',
      body: {
        buildId,
        upstreamBranch,
        timings,
        defaultMetadata,
      },
      bodyDesc: timings.length === 1 ? `${timings.length} timing` : `${timings.length} timings`,
    });
  }

  /**
   * Report metrics data to the ci-stats service. If running outside of CI this method
   * does nothing as metrics can only be reported when associated with a specific CI build.
   */
  async metrics(metrics: CiStatsMetric[]) {
    if (!this.hasBuildConfig()) {
      return;
    }

    const buildId = this.config?.buildId;

    if (!buildId) {
      throw new Error(`CiStatsReporter can't be authorized without a buildId`);
    }

    return await this.req({
      auth: true,
      path: '/v1/metrics',
      body: {
        buildId,
        metrics,
      },
      bodyDesc: `metrics: ${metrics
        .map(({ group, id, value }) => `[${group}/${id}=${value}]`)
        .join(' ')}`,
    });
  }

  /**
   * In order to allow this code to run before @kbn/utils is built, @kbn/pm will pass
   * in the upstreamBranch when calling the timings() method. Outside of @kbn/pm
   * we rely on @kbn/utils to find the package.json file.
   */
  private getUpstreamBranch() {
    // specify the module id in a way that will keep webpack from bundling extra code into @kbn/pm
    const hideFromWebpack = ['@', 'kbn/utils'];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { kibanaPackageJson } = require(hideFromWebpack.join(''));
    return kibanaPackageJson.branch;
  }

  /**
   * In order to allow this code to run before @kbn/utils is built, @kbn/pm will pass
   * in the kibanaUuid when calling the timings() method. Outside of @kbn/pm
   * we rely on @kbn/utils to find the repo root.
   */
  private getKibanaUuid() {
    // specify the module id in a way that will keep webpack from bundling extra code into @kbn/pm
    const hideFromWebpack = ['@', 'kbn/utils'];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { REPO_ROOT } = require(hideFromWebpack.join(''));
    try {
      return Fs.readFileSync(Path.resolve(REPO_ROOT, 'data/uuid'), 'utf-8').trim();
    } catch (error) {
      if (error.code === 'ENOENT') {
        return undefined;
      }

      throw error;
    }
  }

  private async req({ auth, body, bodyDesc, path }: ReqOptions) {
    let attempt = 0;
    const maxAttempts = 5;

    let headers;
    if (auth && this.config) {
      headers = {
        Authorization: `token ${this.config.apiToken}`,
      };
    } else if (auth) {
      throw new Error('this.req() shouldnt be called with auth=true if this.config is defined');
    }

    while (true) {
      attempt += 1;

      try {
        await Axios.request({
          method: 'POST',
          url: path,
          baseURL: BASE_URL,
          headers,
          data: body,
        });

        return true;
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
