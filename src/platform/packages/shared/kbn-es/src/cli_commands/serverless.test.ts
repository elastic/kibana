/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serverless } from './serverless';

const mockRunServerless = jest.fn();
jest.mock('../cluster', () => ({
  Cluster: jest.fn().mockImplementation(() => ({ runServerless: mockRunServerless })),
}));

describe('es serverless', () => {
  const originalArgv = process.argv;

  const runWithArgs = async (args: string[]) => {
    process.argv = ['node', 'scripts/es', 'serverless', '--projectType', 'security', ...args];
    await serverless.run({});
    expect(mockRunServerless).toHaveBeenCalledTimes(1);
    const [[options]] = mockRunServerless.mock.calls;
    return options;
  };

  beforeEach(() => {
    mockRunServerless.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  test('keeps the UIAM ephemeral token expiration unset when the flag is not passed', async () => {
    const options = await runWithArgs([]);
    expect(options.uiamEphemeralTokenExpiration).toBeUndefined();
  });

  test('keeps the UIAM ephemeral token expiration unset when the flag value is empty', async () => {
    const options = await runWithArgs(['--uiam-ephemeral-token-expiration=']);
    expect(options.uiamEphemeralTokenExpiration).toBeUndefined();
  });

  test('passes the UIAM ephemeral token expiration when the flag is set', async () => {
    const options = await runWithArgs(['--uiam-ephemeral-token-expiration', 'PT1M']);
    expect(options.uiamEphemeralTokenExpiration).toBe('PT1M');
  });
});
