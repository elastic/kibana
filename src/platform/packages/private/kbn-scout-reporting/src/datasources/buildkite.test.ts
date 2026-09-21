/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteMetadata } from './buildkite';

describe('buildkite metadata', () => {
  const originalEnv = process.env;

  // `buildkite` is resolved at import time, so each case needs a fresh module registry.
  const loadMetadata = async (env: Record<string, string>): Promise<BuildkiteMetadata> => {
    const nextEnv = { ...originalEnv };
    // Drop inherited values so the assertions hold when these tests run on Buildkite themselves.
    delete nextEnv.BUILDKITE;
    delete nextEnv.BUILDKITE_RETRY_COUNT;

    process.env = { ...nextEnv, ...env };
    jest.resetModules();
    return (await import('./buildkite')).buildkite;
  };

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports retry_count 0 on the original run', async () => {
    const metadata = await loadMetadata({ BUILDKITE: 'true', BUILDKITE_RETRY_COUNT: '0' });
    expect(metadata.retry_count).toBe(0);
  });

  it('reports how many times the job was retried', async () => {
    expect(
      (await loadMetadata({ BUILDKITE: 'true', BUILDKITE_RETRY_COUNT: '1' })).retry_count
    ).toBe(1);
    expect(
      (await loadMetadata({ BUILDKITE: 'true', BUILDKITE_RETRY_COUNT: '2' })).retry_count
    ).toBe(2);
  });

  it('falls back to 0 when BUILDKITE_RETRY_COUNT is missing or malformed', async () => {
    expect((await loadMetadata({ BUILDKITE: 'true' })).retry_count).toBe(0);
    expect((await loadMetadata({ BUILDKITE: 'true', BUILDKITE_RETRY_COUNT: '' })).retry_count).toBe(
      0
    );
  });

  it('is not reported outside Buildkite', async () => {
    const metadata = await loadMetadata({ BUILDKITE_RETRY_COUNT: '1' });
    expect(metadata.retry_count).toBeUndefined();
  });
});
