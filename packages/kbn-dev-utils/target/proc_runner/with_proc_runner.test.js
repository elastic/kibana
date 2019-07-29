"use strict";

var _tooling_log = require("../tooling_log");

var _with_proc_runner = require("./with_proc_runner");

var _proc_runner = require("./proc_runner");

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
it('passes proc runner to a function', async () => {
  await (0, _with_proc_runner.withProcRunner)(new _tooling_log.ToolingLog(), proc => {
    expect(proc).toBeInstanceOf(_proc_runner.ProcRunner);
  });
});
it('calls procRunner.teardown() if function returns synchronously', async () => {
  let teardownSpy;
  await (0, _with_proc_runner.withProcRunner)(new _tooling_log.ToolingLog(), proc => {
    teardownSpy = jest.spyOn(proc, 'teardown');
  });
  expect(teardownSpy).toHaveBeenCalled();
});
it('calls procRunner.teardown() if function throw synchronous error, and rejects with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;
  await expect((0, _with_proc_runner.withProcRunner)(new _tooling_log.ToolingLog(), proc => {
    teardownSpy = jest.spyOn(proc, 'teardown');
    throw error;
  })).rejects.toThrowError(error);
  expect(teardownSpy).toHaveBeenCalled();
});
it('waits for promise to resolve before tearing down proc', async () => {
  let teardownSpy;
  await (0, _with_proc_runner.withProcRunner)(new _tooling_log.ToolingLog(), async proc => {
    await new Promise(resolve => setTimeout(resolve, 500));
    teardownSpy = jest.spyOn(proc, 'teardown');
  });
  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});
it('waits for promise to reject before tearing down proc and rejecting with the error', async () => {
  const error = new Error('foo');
  let teardownSpy;
  await expect((0, _with_proc_runner.withProcRunner)(new _tooling_log.ToolingLog(), async proc => {
    await new Promise(resolve => setTimeout(resolve, 500));
    teardownSpy = jest.spyOn(proc, 'teardown');
    throw error;
  })).rejects.toThrowError(error);
  expect(teardownSpy).not.toBe(undefined);
  expect(teardownSpy).toHaveBeenCalled();
});