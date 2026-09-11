/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { createFailError } from '@kbn/dev-cli-errors';
import { isFailError } from '@kbn/dev-cli-errors';

import type { Config, EsVersion } from '../../functional_test_runner';
import { FTR_TEST_FAILURES_EXIT_CODE, runFtr } from './run_ftr';

type FailError = ReturnType<typeof createFailError>;

const mockRun = jest.fn<Promise<number>, [AbortSignal | undefined, number | undefined]>();

jest.mock('../../functional_test_runner', () => ({
  FunctionalTestRunner: jest.fn(() => ({ run: mockRun })),
}));

const log = new ToolingLog();
const config = {} as Config;
const esVersion = {} as EsVersion;

const runAndCatch = async (signal?: AbortSignal): Promise<FailError> => {
  try {
    await runFtr({ log, config, esVersion, signal });
  } catch (error) {
    if (!isFailError(error)) {
      throw error;
    }
    return error;
  }
  throw new Error('expected runFtr to throw');
};

describe('runFtr', () => {
  beforeEach(() => {
    mockRun.mockReset();
  });

  it('resolves when no test failed', async () => {
    mockRun.mockResolvedValue(0);
    await expect(runFtr({ log, config, esVersion })).resolves.toBeUndefined();
  });

  it('exits with the dedicated test-failures code when the run completed with failures', async () => {
    mockRun.mockResolvedValue(2);
    const error = await runAndCatch();
    expect(error.exitCode).toBe(FTR_TEST_FAILURES_EXIT_CODE);
    expect(error.message).toBe('2 functional test failures');
  });

  it('exits with 1 when the run was aborted, since not every test ran', async () => {
    const ctrl = new AbortController();
    mockRun.mockImplementation(async () => {
      ctrl.abort();
      return 1;
    });
    const error = await runAndCatch(ctrl.signal);
    expect(error.exitCode).toBe(1);
  });
});
