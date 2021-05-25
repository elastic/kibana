/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Writable } from 'stream';

import { startServersCli } from './cli';
import { checkMockConsoleLogSnapshot } from '../../test_helpers';

// Note: Stub the startServers function to keep testing only around the cli
// method and arguments.
jest.mock('../../tasks', () => ({
  startServers: jest.fn(),
}));

describe('start servers CLI', () => {
  describe('options', () => {
    const originalObjects = { process, console };
    const exitMock = jest.fn();
    const logMock = jest.fn(); // mock logging so we don't send output to the test results
    const argvMock = ['foo', 'foo'];

    const processMock = {
      exit: exitMock,
      argv: argvMock,
      stdout: new Writable(),
      cwd: jest.fn(),
      env: {
        ...originalObjects.process.env,
        TEST_ES_FROM: 'snapshot',
      },
    };

    beforeAll(() => {
      global.process = processMock;
      global.console = { log: logMock };
    });

    afterAll(() => {
      global.process = originalObjects.process;
      global.console = originalObjects.console;
    });

    beforeEach(() => {
      global.process.argv = [...argvMock];
      global.process.env = {
        ...originalObjects.process.env,
        TEST_ES_FROM: 'snapshot',
      };
      jest.resetAllMocks();
    });

    it('rejects boolean config value', async () => {
      global.process.argv.push('--config');

      await startServersCli();

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('rejects empty config value if no default passed', async () => {
      global.process.argv.push('--config', '');

      await startServersCli();

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('accepts empty config value if default passed', async () => {
      global.process.argv.push('--config', '');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('rejects bail', async () => {
      global.process.argv.push('--bail', true);

      await startServersCli('foo');

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('accepts string value for kibana-install-dir', async () => {
      global.process.argv.push('--kibana-install-dir', 'foo');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('rejects boolean value for kibana-install-dir', async () => {
      global.process.argv.push('--kibana-install-dir');

      await startServersCli('foo');

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('accepts boolean value for updateBaselines', async () => {
      global.process.argv.push('--updateBaselines');

      await startServersCli('foo');

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('accepts boolean value for updateSnapshots', async () => {
      global.process.argv.push('--updateSnapshots');

      await startServersCli('foo');

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });

    it('accepts source value for esFrom', async () => {
      global.process.argv.push('--esFrom', 'source');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts debug option', async () => {
      global.process.argv.push('--debug');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts silent option', async () => {
      global.process.argv.push('--silent');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts quiet option', async () => {
      global.process.argv.push('--quiet');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts verbose option', async () => {
      global.process.argv.push('--verbose');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts extra server options', async () => {
      global.process.argv.push('--', '--server.foo=bar');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts help option even if invalid options passed', async () => {
      global.process.argv.push('--debug', '--grep', '--help');

      await startServersCli('foo');

      expect(exitMock).not.toHaveBeenCalledWith(1);
    });

    it('rejects invalid options even if valid options exist', async () => {
      global.process.argv.push('--debug', '--grep', '--bail');

      await startServersCli('foo');

      expect(exitMock).toHaveBeenCalledWith(1);
      checkMockConsoleLogSnapshot(logMock);
    });
  });
});
