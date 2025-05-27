/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStartServer } from './start_server';
import { initLogsDir } from '@kbn/test';
import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { startServers, parseServerFlags } from '../servers';

jest.mock('@kbn/test', () => ({
  initLogsDir: jest.fn(),
}));

jest.mock('../servers', () => ({
  parseServerFlags: jest.fn().mockReturnValue({ logsDir: 'path/to/logs/directory' }),
  startServers: jest.fn().mockResolvedValue(undefined),
}));

describe('runStartServer', () => {
  let flagsReader: jest.Mocked<FlagsReader>;
  let log: jest.Mocked<ToolingLog>;

  beforeEach(() => {
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
