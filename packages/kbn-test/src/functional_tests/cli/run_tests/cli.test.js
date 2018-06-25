/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { runTestsCli } from './cli';

// Note: Stub the runTests function to keep testing only around the cli
// method and arguments.
jest.mock('../../tasks', () => ({
  runTests: jest.fn(),
}));

describe('run tests CLI', () => {
  describe('options', () => {
    const originalObjects = {};
    const exitMock = jest.fn();
    const logMock = jest.fn(); // mock logging so we don't send output to the test results
    const argvMock = ['foo', 'foo'];

    const processMock = {
      exit: exitMock,
      argv: argvMock,
      stdout: { on: jest.fn(), once: jest.fn(), emit: jest.fn() },
      cwd: jest.fn(),
    };

    beforeAll(() => {
      originalObjects.process = process;
      originalObjects.console = console;
      global.process = processMock;
      global.console = { log: logMock };
    });

    afterAll(() => {
      global.process = originalObjects.process;
      global.console = originalObjects.console;
    });

    beforeEach(() => {
      global.process.argv = [...argvMock];
      jest.resetAllMocks();
    });

    it('rejects boolean config value', async () => {
      global.process.argv.push('--config');

      await runTestsCli();

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('rejects empty config value if no default passed', async () => {
      global.process.argv.push('--config', '');

      await runTestsCli();

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('accepts empty config value if default passed', async () => {
      global.process.argv.push('--config', '');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('rejects non-boolean value for bail', async () => {
      global.process.argv.push('--bail', 'peanut');

      await runTestsCli(['foo']);

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('accepts string value for kibana-install-dir', async () => {
      global.process.argv.push('--kibana-install-dir', 'foo');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('rejects boolean value for kibana-install-dir', async () => {
      global.process.argv.push('--kibana-install-dir');

      await runTestsCli(['foo']);

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('accepts boolean value for updateBaselines', async () => {
      global.process.argv.push('--updateBaselines');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalledWith();
    });

    it('accepts source value for esFrom', async () => {
      global.process.argv.push('--esFrom', 'source');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('rejects non-enum value for esFrom', async () => {
      global.process.argv.push('--esFrom', 'butter');

      await runTestsCli(['foo']);

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('accepts value for grep', async () => {
      global.process.argv.push('--grep', 'management');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts debug option', async () => {
      global.process.argv.push('--debug');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts silent option', async () => {
      global.process.argv.push('--silent');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts quiet option', async () => {
      global.process.argv.push('--quiet');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts verbose option', async () => {
      global.process.argv.push('--verbose');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts extra server options', async () => {
      global.process.argv.push('--', '--server.foo=bar');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalled();
    });

    it('accepts help option even if invalid options passed', async () => {
      global.process.argv.push('--debug', '--aintnothang', '--help');

      await runTestsCli(['foo']);

      expect(exitMock).not.toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });

    it('rejects invalid options even if valid options exist', async () => {
      global.process.argv.push('--debug', '--aintnothang', '--bail');

      await runTestsCli(['foo']);

      expect(exitMock).toHaveBeenCalledWith(1);
      expect(logMock.mock.calls).toMatchSnapshot();
    });
  });
});
