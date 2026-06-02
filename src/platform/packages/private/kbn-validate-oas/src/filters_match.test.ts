/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { filtersMatch } from './filters_match';

jest.mock('execa', () => jest.fn());

const mockedExeca = execa as jest.MockedFunction<typeof execa>;

describe('filtersMatch', () => {
  beforeEach(() => {
    mockedExeca.mockReset();
  });

  test('returns true when grep finds at least one route-style path', async () => {
    mockedExeca.mockResolvedValue({} as never);

    await expect(filtersMatch(['/api/fleet'], './oas_docs/output/kibana.yaml')).resolves.toBe(true);
    expect(mockedExeca).toHaveBeenCalledWith('grep', [
      '-F',
      '-q',
      '-s',
      '-r',
      '-e',
      '/api/fleet',
      './oas_docs/output/kibana.yaml',
    ]);
  });

  test('translates JSON pointer filter to route path for literal grep match', async () => {
    mockedExeca.mockResolvedValue({} as never);

    await expect(
      filtersMatch(
        ['/paths/~1api~1fleet~1agent_policies~1{agentPolicyId}'],
        './oas_docs/output/kibana.yaml'
      )
    ).resolves.toBe(true);
    expect(mockedExeca).toHaveBeenCalledWith('grep', [
      '-F',
      '-q',
      '-s',
      '-r',
      '-e',
      '/api/fleet/agent_policies/{agentPolicyId}',
      './oas_docs/output/kibana.yaml',
    ]);
  });

  test('returns false on grep exit code 1 (no matches)', async () => {
    mockedExeca.mockRejectedValue({ exitCode: 1 } as never);

    await expect(filtersMatch(['/api/not-real'], './oas_docs/output/kibana.yaml')).resolves.toBe(
      false
    );
  });

  test('rethrows non-no-match errors', async () => {
    const error = new Error('boom');
    mockedExeca.mockRejectedValue({ ...error, exitCode: 2 } as never);

    await expect(
      filtersMatch(['/api/fleet'], './oas_docs/output/kibana.yaml')
    ).rejects.toBeDefined();
  });
});
