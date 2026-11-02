/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';

/**
 * Information about how CiStatsReporter should talk to the ci-stats service. Normally
 * it is read from a JSON environment variable using the `parseConfig()` function
 * exported by this module.
 */
export interface Config {
  /** Upstream token for direct access; omitted when using the access broker. */
  apiToken?: string;
  /** CI Stats endpoint, including the capability path when using the access broker. */
  apiUrl?: string;
  /** Buildkite OIDC tokens are minted on demand when using the access broker. */
  authType?: 'token' | 'buildkite_oidc';
  /**
   * uuid which should be obtained by first creating a build with the
   * ci-stats service and then passing it to all subsequent steps
   */
  buildId: string;
}

function validateConfig(log: SomeDevLog, config: { [k in keyof Config]: unknown }) {
  if (
    config.authType !== undefined &&
    config.authType !== 'token' &&
    config.authType !== 'buildkite_oidc'
  ) {
    log.warning(
      'KIBANA_CI_STATS_CONFIG has an invalid authentication type, stats will not be reported'
    );
    return;
  }

  const validApiUrl = typeof config.apiUrl === 'string' && /^https?:\/\//.test(config.apiUrl);
  if ((config.apiUrl !== undefined || config.authType === 'buildkite_oidc') && !validApiUrl) {
    log.warning('KIBANA_CI_STATS_CONFIG is missing a valid api URL, stats will not be reported');
    return;
  }

  const validApiToken = typeof config.apiToken === 'string' && config.apiToken.length !== 0;
  if (config.authType !== 'buildkite_oidc' && !validApiToken) {
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

export function parseConfig(log: SomeDevLog) {
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
