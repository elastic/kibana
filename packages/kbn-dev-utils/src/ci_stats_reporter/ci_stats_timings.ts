/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';
import Os from 'os';

import Axios from 'axios';

import { parseConfig, Config } from './ci_stats_config';
import type { ToolingLog } from '../tooling_log';

interface Options {
  upstreamBranch?: string;
  defaultMetadata?: CiStatsTiming['meta'];
}

export interface CiStatsTiming {
  group: string;
  id: string;
  ms: number;
  meta?: {
    [key: string]: string | string[] | number | boolean | undefined;
  };
}

export class CiStatsTimings {
  static fromEnv(log: ToolingLog, options?: Options) {
    return new CiStatsTimings(
      log,
      options?.upstreamBranch ?? CiStatsTimings.getUpstreamBranch(),
      {
        ...options?.defaultMetadata,
        os_kernel: Os.release(),
        host_platform: Os.platform(),
        system_cpu_cores: Os.cpus()?.length,
        system_cpu_name: Os.cpus()[0]?.model,
        system_cpu_speed: Os.cpus()[0]?.speed,
        host_architecture: Os.arch(),
      },
      parseConfig(log)
    );
  }

  private static getUpstreamBranch() {
    // in order to allow this code to run before @kbn/utils is built, @kbn/pm will pass in the upstreamBranch
    // when constructing the CiStatsTimings object. Outside of @kbn/pm we rely on @kbn/utils to find the package.json file

    const hideFromWebpack = ['@', 'kbn/utils'];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { kibanaPackageJson } = require(hideFromWebpack.join(''));
    return kibanaPackageJson.branch;
  }

  private constructor(
    private log: ToolingLog,
    private upstreamBranch: string,
    private defaultMetadata?: CiStatsTiming['meta'],
    private config?: Config
  ) {}

  isEnabled() {
    return process.env.CI_STATS_DISABLED !== 'true';
  }

  async timings(timings: CiStatsTiming[]) {
    if (!this.isEnabled() || timings.length === 0) {
      return true;
    }

    let attempt = 0;
    const maxAttempts = 5;
    while (true) {
      attempt++;

      try {
        await Axios.request({
          method: 'POST',
          url: 'https://ci-stats.kibana.dev/v1/timings',
          headers: this.config?.apiToken
            ? {
                Authorization: `token ${this.config.apiToken}`,
              }
            : undefined,
          data: {
            buildId: this.config?.buildId,
            timings,
            upstreamBranch: this.upstreamBranch,
            defaultMetadata: this.defaultMetadata,
          },
        });
        return true;
      } catch (error) {
        if (!error?.request) {
          // not an axios error, must be a usage error that we should notify user about
          throw error;
        }

        if (error?.response && error.response.status < 500) {
          const status = error.response.status;
          // error response from service was received so warn the user and move on
          this.log.warning(
            `error recording timings [status=${status}] [resp=${inspect(error.response.data)}] `
          );
          return;
        }

        if (attempt === maxAttempts) {
          this.log.warning(
            `failed to reach kibana-ci-stats service too many times, unable to record timings`
          );
          return;
        }

        // we failed to reach the backend and we have remaining attempts, lets retry after a short delay
        const reason = error?.response?.status
          ? `${error.response.status} response`
          : 'no response';

        this.log.warning(
          `failed to reach kibana-ci-stats service [reason=${reason}], retrying in ${attempt} seconds`
        );

        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
}
