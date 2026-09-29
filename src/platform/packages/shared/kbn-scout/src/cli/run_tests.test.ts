/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { runScoutPlaywrightConfig } from './run_tests';
import { initLogsDir } from './init_logs_dir';
import { parseTestFlags, runTests } from '../playwright/runner';

vi.mock('./init_logs_dir', () => {
  const mocked = {
    initLogsDir: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../playwright/runner', () => {
  const mocked = {
    parseTestFlags: vi.fn().mockResolvedValue({ logsDir: 'path/to/logs/directory' }),
    runTests: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

describe('runScoutPlaywrightConfig', () => {
  let flagsReader: Mocked<FlagsReader>;
  let log: Mocked<ToolingLog>;

  beforeAll(() => {
    flagsReader = {
      arrayOfStrings: vi.fn(),
      boolean: vi.fn(),
    } as any;

    log = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
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
