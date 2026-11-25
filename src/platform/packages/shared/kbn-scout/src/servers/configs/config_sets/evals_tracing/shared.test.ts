/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, statSync, unlinkSync } from 'fs';
import type { ScoutServerConfig } from '../../../../types';

const GCS_SETTING_PREFIX = 'gcs.client.default.credentials_file=';

const loadServers = (modulePath: string, env: Record<string, string>): ScoutServerConfig => {
  let servers: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    ({ servers } = jest.requireActual(modulePath));
  });
  if (!servers) throw new Error(`${modulePath} failed to load`);
  return servers;
};

describe.each([
  { arch: 'stateful', modulePath: './stateful/classic.stateful.config' },
  { arch: 'serverless', modulePath: './serverless/observability_complete.serverless.config' },
])('evals_tracing config set ($arch)', ({ modulePath }) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GCS_CREDENTIALS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('adds no secure file without GCS_CREDENTIALS', () => {
    const { esTestCluster } = loadServers(modulePath, {});

    expect(esTestCluster.secureFiles ?? []).not.toContainEqual(
      expect.stringContaining(GCS_SETTING_PREFIX)
    );
  });

  it('writes GCS_CREDENTIALS to an owner-only temp file and points ES at it', () => {
    const credentials = '{"type":"service_account"}';
    const { esTestCluster } = loadServers(modulePath, { GCS_CREDENTIALS: credentials });

    const entry = esTestCluster.secureFiles?.find((file) => file.startsWith(GCS_SETTING_PREFIX));
    if (!entry) throw new Error('GCS secure file setting is missing');
    const filePath = entry.slice(GCS_SETTING_PREFIX.length);
    try {
      expect(readFileSync(filePath, 'utf8')).toBe(credentials);
      // Only the Scout process reads this file, so other local users must not be able to.
      expect(statSync(filePath).mode.toString(8).slice(-3)).toBe('600');
    } finally {
      unlinkSync(filePath);
    }
  });
});
