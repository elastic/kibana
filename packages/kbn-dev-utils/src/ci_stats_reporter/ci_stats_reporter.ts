/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { inspect } from 'util';

import Axios from 'axios';

import { ToolingLog } from '../tooling_log';

interface Config {
  apiUrl: string;
  apiToken: string;
  buildId: string;
}

export type CiStatsMetrics = Array<{
  group: string;
  id: string;
  value: number;
  limit?: number;
  limitConfigPath?: string;
}>;

function parseConfig(log: ToolingLog) {
  const configJson = process.env.KIBANA_CI_STATS_CONFIG;
  if (!configJson) {
    log.debug('KIBANA_CI_STATS_CONFIG environment variable not found, disabling CiStatsReporter');
    return;
  }

  let config: unknown;
  try {
    config = JSON.parse(configJson);
  } catch (_) {
    // handled below
  }

  if (typeof config === 'object' && config !== null) {
    return validateConfig(log, config as { [k in keyof Config]: unknown });
  }

  log.warning('KIBANA_CI_STATS_CONFIG is invalid, stats will not be reported');
  return;
}

function validateConfig(log: ToolingLog, config: { [k in keyof Config]: unknown }) {
  const validApiUrl = typeof config.apiUrl === 'string' && config.apiUrl.length !== 0;
  if (!validApiUrl) {
    log.warning('KIBANA_CI_STATS_CONFIG is missing a valid api url, stats will not be reported');
    return;
  }

  const validApiToken = typeof config.apiToken === 'string' && config.apiToken.length !== 0;
  if (!validApiToken) {
    log.warning('KIBANA_CI_STATS_CONFIG is missing a valid api token, stats will not be reported');
    return;
  }

  const validId = typeof config.buildId === 'string' && config.buildId.length !== 0;
  if (!validId) {
    log.warning('KIBANA_CI_STATS_CONFIG is missing a valid build id, stats will not be reported');
    return;
  }

  return config as Config;
}

export class CiStatsReporter {
  static fromEnv(log: ToolingLog) {
    return new CiStatsReporter(parseConfig(log), log);
  }

  constructor(private config: Config | undefined, private log: ToolingLog) {}

  isEnabled() {
    return !!this.config;
  }

  async metrics(metrics: CiStatsMetrics) {
    if (!this.config) {
      return;
    }

    let attempt = 0;
    const maxAttempts = 5;
    const bodySummary = metrics
      .map(({ group, id, value }) => `[${group}/${id}=${value}]`)
      .join(' ');

    while (true) {
      attempt += 1;

      try {
        await Axios.request({
          method: 'POST',
          url: '/v1/metrics',
          baseURL: this.config.apiUrl,
          headers: {
            Authorization: `token ${this.config.apiToken}`,
          },
          data: {
            buildId: this.config.buildId,
            metrics,
          },
        });

        return;
      } catch (error) {
        if (!error?.request) {
          // not an axios error, must be a usage error that we should notify user about
          throw error;
        }

        if (error?.response && error.response.status !== 502) {
          // error response from service was received so warn the user and move on
          this.log.warning(
            `error recording metric [status=${error.response.status}] [resp=${inspect(
              error.response.data
            )}] ${bodySummary}`
          );
          return;
        }

        if (attempt === maxAttempts) {
          this.log.warning(
            `failed to reach kibana-ci-stats service too many times, unable to record metric ${bodySummary}`
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
