/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { parseConfig } from './ci_stats_config';

describe('parseConfig', () => {
  const log = new ToolingLog();
  const originalConfig = process.env.KIBANA_CI_STATS_CONFIG;

  afterEach(() => {
    if (originalConfig === undefined) {
      delete process.env.KIBANA_CI_STATS_CONFIG;
    } else {
      process.env.KIBANA_CI_STATS_CONFIG = originalConfig;
    }
  });

  it('accepts broker configuration without an upstream token', () => {
    const config = {
      buildId: 'build-id',
      apiUrl: 'https://broker.example/proxy/kibana.ci_stats',
      authType: 'buildkite_oidc',
    };
    process.env.KIBANA_CI_STATS_CONFIG = JSON.stringify(config);
    expect(parseConfig(log)).toEqual(config);
  });

  it('preserves direct token configuration', () => {
    const config = { buildId: 'build-id', apiToken: 'upstream-token' };
    process.env.KIBANA_CI_STATS_CONFIG = JSON.stringify(config);
    expect(parseConfig(log)).toEqual(config);
  });

  it.each([
    { buildId: 'build-id' },
    { buildId: 'build-id', authType: 'buildkite_oidc' },
    { buildId: 'build-id', authType: 'buildkite_oidc', apiUrl: 'not-a-url' },
    { buildId: 'build-id', apiToken: 'token', authType: 'unsupported' },
    { apiUrl: 'https://broker.example', authType: 'buildkite_oidc' },
  ])('rejects invalid configuration %j', (config) => {
    process.env.KIBANA_CI_STATS_CONFIG = JSON.stringify(config);
    expect(parseConfig(log)).toBeUndefined();
  });
});
