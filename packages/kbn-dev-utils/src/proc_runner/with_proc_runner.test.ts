/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from './with_proc_runner';
import { ProcRunner } from './proc_runner';

it('passes proc runner to a function', async () => {
  await withProcRunner(new ToolingLog(), async (proc) => {
    expect(proc).toBeInstanceOf(ProcRunner);
  });
});

it('calls procRunner.teardown() if function returns synchronously', async () => {
  let teardownSpy;
  await withProcRunner(new ToolingLog(), async (proc) => {
    teardownSpy = jest.spyOn(proc, 'teardown');
  });

  expect(teardownSpy).toHaveBeenCalled();
});

it('calls procRunner.teardown() if function throw synchronous error, and rejects with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;

  await expect(
    withProcRunner(new ToolingLog(), async (proc) => {
      teardownSpy = jest.spyOn(proc, 'teardown');
      throw error;
    })
  ).rejects.toThrowError(error);

  expect(teardownSpy).toHaveBeenCalled();
});

it('waits for promise to resolve before tearing down proc', async () => {
  let teardownSpy;

  await withProcRunner(new ToolingLog(), async (proc) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    teardownSpy = jest.spyOn(proc, 'teardown');
  });

  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});

it('waits for promise to reject before tearing down proc and rejecting with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;

  await expect(
    withProcRunner(new ToolingLog(), async (proc) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      teardownSpy = jest.spyOn(proc, 'teardown');
      throw error;
    })
  ).rejects.toThrowError(error);

  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});
