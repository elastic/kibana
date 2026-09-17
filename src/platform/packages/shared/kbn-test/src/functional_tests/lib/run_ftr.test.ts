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
const mockRunner = { run: mockRun, aborted: false };

jest.mock('../../functional_test_runner', () => ({
  FunctionalTestRunner: jest.fn(() => mockRunner),
}));

const log = new ToolingLog();
const esVersion = {} as EsVersion;
const configWith = (bail: boolean): Config =>
  ({ get: (key: string) => (key === 'mochaOpts.bail' ? bail : undefined) } as unknown as Config);
const config = configWith(false);

const runAndCatch = async (cfg: Config = config): Promise<FailError> => {
  try {
    await runFtr({ log, config: cfg, esVersion });
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
    mockRunner.aborted = false;
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

  it('exits with 1 when the run was aborted (external signal or internal abort such as a Mocha timeout), since not every test ran', async () => {
    mockRun.mockImplementation(async () => {
      mockRunner.aborted = true;
      return 1;
    });
    const error = await runAndCatch();
    expect(error.exitCode).toBe(1);
  });

  it('exits with 1 when an aborted attempt was followed by a passing retry, since the tests the abort cut off never ran', async () => {
    mockRun.mockImplementation(async () => {
      mockRunner.aborted = true;
      return 0;
    });
    const error = await runAndCatch();
    expect(error.exitCode).toBe(1);
    expect(error.message).toBe('run aborted before every test ran');
  });

  it('exits with 1 when bail is on (CLI flag, FTR_EXTRA_ARGS or mochaOpts), since the run stopped at the first failure', async () => {
    mockRun.mockResolvedValue(1);
    const error = await runAndCatch(configWith(true));
    expect(error.exitCode).toBe(1);
  });
});
