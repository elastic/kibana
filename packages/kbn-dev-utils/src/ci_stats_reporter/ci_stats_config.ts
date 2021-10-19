/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ToolingLog } from '../tooling_log';

/**
 * Information about how CiStatsReporter should talk to the ci-stats service. Normally
 * it is read from a JSON environment variable using the `parseConfig()` function
 * exported by this module.
 */
export interface Config {
  /** ApiToken necessary for writing build data to ci-stats service */
  apiToken: string;
  /**
   * uuid which should be obtained by first creating a build with the
   * ci-stats service and then passing it to all subsequent steps
   */
  buildId: string;
}

function validateConfig(log: ToolingLog, config: { [k in keyof Config]: unknown }) {
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

export function parseConfig(log: ToolingLog) {
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
