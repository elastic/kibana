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

import { runCli } from './run_cli';
import { checkMockConsoleLogSnapshot } from '../test_helpers';

const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

const actualProcessArgv = process.argv;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

beforeEach(() => {
  process.argv = actualProcessArgv.slice(0, 2);
  jest.clearAllMocks();
});

afterAll(() => {
  process.argv = actualProcessArgv;
});

it('accepts help option even if invalid options passed', async () => {
  process.argv.push('--foo', '--bar', '--help');

  const mockGetHelpText = jest.fn().mockReturnValue('mock help text');
  const mockRun = jest.fn();
  await runCli(mockGetHelpText, mockRun);

  expect(mockProcessExit).not.toHaveBeenCalled();
  expect(mockGetHelpText).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledWith('mock help text');
  expect(mockRun).not.toHaveBeenCalled();
});

it('passes parsed argv to run function', async () => {
  process.argv.push('--foo', 'bar', '--baz=box', '--', 'a', 'b', 'c');

  const mockGetHelpText = jest.fn();
  const mockRun = jest.fn();
  await runCli(mockGetHelpText, mockRun);

  expect(mockGetHelpText).not.toHaveBeenCalled();
  expect(mockConsoleLog).not.toHaveBeenCalled();
  expect(mockProcessExit).not.toHaveBeenCalled();
  expect(mockRun).toHaveBeenCalledTimes(1);
  expect(mockRun).toHaveBeenCalledWith({
    foo: 'bar',
    baz: 'box',
    _: ['a', 'b', 'c'],
  });
});

it('waits for promise returned from run function to resolve before resolving', async () => {
  let resolveMockRun;
  const mockRun = jest.fn().mockImplementation(
    () =>
      new Promise(resolve => {
        resolveMockRun = resolve;
      })
  );

  const onResolved = jest.fn();
  const promise = runCli(null, mockRun).then(onResolved);

  expect(mockRun).toHaveBeenCalled();
  expect(onResolved).not.toHaveBeenCalled();

  await sleep(500);

  expect(onResolved).not.toHaveBeenCalled();

  resolveMockRun();
  await promise;
  expect(onResolved).toHaveBeenCalled();
});

it('logs the stack then exits when run function throws an error', async () => {
  await runCli(null, () => {
    const error = new Error('foo error');
    error.stack = 'foo error\n  stack 1\n  stack 2\n  stack 3';
    throw error;
  });

  expect(mockProcessExit).toHaveBeenCalledTimes(1);
  expect(mockProcessExit).toHaveBeenCalledWith(1);

  expect(mockConsoleLog).toHaveBeenCalled();
  checkMockConsoleLogSnapshot(mockConsoleLog);
});

it('logs no stack trace then exits when stack missing', async () => {
  await runCli(null, () => {
    const error = new Error('foo error');
    error.stack = undefined;
    throw error;
  });

  expect(mockProcessExit).toHaveBeenCalledTimes(1);
  expect(mockProcessExit).toHaveBeenCalledWith(1);

  expect(mockConsoleLog).toHaveBeenCalled();
  checkMockConsoleLogSnapshot(mockConsoleLog);
});

it('does right thing when non-error is thrown', async () => {
  await runCli(null, () => {
    throw 'foo bar';
  });

  expect(mockProcessExit).toHaveBeenCalledTimes(1);
  expect(mockProcessExit).toHaveBeenCalledWith(1);

  expect(mockConsoleLog).toHaveBeenCalled();
  checkMockConsoleLogSnapshot(mockConsoleLog);
});
