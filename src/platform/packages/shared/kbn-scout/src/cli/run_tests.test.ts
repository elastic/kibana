/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { runScoutPlaywrightConfig } from './run_tests';
import { initLogsDir } from '@kbn/test';
import { parseTestFlags, runTests } from '../playwright/runner';

jest.mock('@kbn/test', () => ({
  initLogsDir: jest.fn(),
}));

jest.mock('../playwright/runner', () => ({
  parseTestFlags: jest.fn().mockResolvedValue({ logsDir: 'path/to/logs/directory' }),
  runTests: jest.fn().mockResolvedValue(undefined),
}));

describe('runScoutPlaywrightConfig', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  beforeAll(() => {
    flagsReader = {
      arrayOfStrings: jest.fn(),
      boolean: jest.fn(),
    } as any;

    log = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;
  });

  it('calls parseTestFlags with the correct flagsReader', async () => {
    await runScoutPlaywrightConfig(flagsReader, log);
    expect(parseTestFlags).toHaveBeenCalledWith(flagsReader);
  });

  it('writes the log output to files instead of to stdout if --logToFile is set', async () => {
    await runScoutPlaywrightConfig(flagsReader, log);
    expect(initLogsDir).toHaveBeenCalledWith(log, 'path/to/logs/directory');
  });

  it('runs the tests', async () => {
    await runScoutPlaywrightConfig(flagsReader, log);
    expect(runTests).toHaveBeenCalledWith(log, { logsDir: 'path/to/logs/directory' });
  });
});
