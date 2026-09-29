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

import { runStartServer } from './start_server';
import { initLogsDir } from './init_logs_dir';
import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { startServers, parseServerFlags } from '../servers';

vi.mock('./init_logs_dir', () => {
      const mocked = {
      initLogsDir: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../servers', () => {
      const mocked = {
      parseServerFlags: vi.fn().mockReturnValue({ logsDir: 'path/to/logs/directory' }),
      startServers: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

describe('runStartServer', () => {
  let flagsReader: Mocked<FlagsReader>;
  let log: Mocked<ToolingLog>;

  beforeEach(() => {
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

  it('calls parseServerFlags with the correct flagsReader', async () => {
    await runStartServer(flagsReader, log);
    expect(parseServerFlags).toHaveBeenCalledWith(flagsReader);
  });

  it('initializes log directory if logsDir is provided', async () => {
    await runStartServer(flagsReader, log);
    expect(initLogsDir).toHaveBeenCalledWith(log, 'path/to/logs/directory');
  });

  it('starts the servers with the correct options', async () => {
    await runStartServer(flagsReader, log);
    expect(startServers).toHaveBeenCalledWith(log, { logsDir: 'path/to/logs/directory' });
  });
});
