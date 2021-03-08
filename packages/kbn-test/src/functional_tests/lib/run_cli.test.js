/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { runCli } from './run_cli';
import { checkMockConsoleLogSnapshot } from '../test_helpers';

const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

const actualProcessArgv = process.argv;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      new Promise((resolve) => {
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
