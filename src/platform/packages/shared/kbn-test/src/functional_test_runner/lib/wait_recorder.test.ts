/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Runnable, Suite } from '../fake_mocha_types';
import { Lifecycle } from './lifecycle';
import { WaitRecorder } from './wait_recorder';

const createRunnable = (title: string, file = 'example.ts', failed = false): Runnable => ({
  title,
  file: join(REPO_ROOT, file),
  titlePath: () => ['suite', title],
  timeout: () => 1000,
  isFailed: () => failed,
  isPending: () => false,
});

const createSuite = (): Suite => ({
  ...createRunnable('suite'),
  file: join(REPO_ROOT, 'shared_setup.ts'),
  _beforeAll: [],
  _beforeEach: [],
  _afterEach: [],
  _afterAll: [],
  suites: [],
  tests: [],
  fullTitle: () => 'suite',
  eachTest: () => {},
  root: false,
  suiteTag: 'suite',
});

const setup = () => {
  let clock = 0;
  const runner = Object.assign(new EventEmitter(), {
    abort: jest.fn(),
    uncaught: jest.fn(),
    failures: 0,
  });
  const recorder = new WaitRecorder(join(REPO_ROOT, 'config.ts'), () => clock);
  recorder.attach(runner);
  const advance = (ms: number) => {
    clock += ms;
  };
  runner.emit('start');
  return { runner, recorder, advance };
};

describe('FTR wait recording', () => {
  it('unions nested waits and keeps retry operation time separate from delays', () => {
    const { runner, recorder, advance } = setup();
    const test = createRunnable('nested waits');
    runner.emit('test', test);
    const retry = recorder.beginWait('retry', 'retry.try');
    const outer = recorder.beginWait('webdriverWait', 'driver.wait');
    advance(10);
    const inner = recorder.beginWait('retryDelay', 'backoff');
    advance(20);
    inner();
    advance(10);
    outer();
    const lookup = recorder.beginWait('lookup', 'findElements');
    advance(5);
    lookup();
    advance(5);
    retry();
    runner.emit('test end', test);
    runner.emit('end');

    const report = recorder.getReport();
    expect(report.durationMs).toBe(50);
    expect(report.waitMs).toBe(40);
    expect(report.waitOrLookupMs).toBe(45);
    expect(report.byCategory.retry).toEqual({ calls: 1, durationMs: 50 });
    expect(report.byCategory.retryDelay.durationMs).toBe(20);
    expect(report.runnables[0]).toMatchObject({ durationMs: 50, waitMs: 40, result: 'passed' });
    expect(report.files[0]).toMatchObject({ file: 'example.ts', waitMs: 40 });
  });

  it('records shared setup and beforeEach hooks separately from the test body', () => {
    const { runner, recorder, advance } = setup();
    const suite = createSuite();
    const setupHook = { ...createRunnable('before all', 'shared_setup.ts'), parent: suite };
    runner.emit('hook', setupHook);
    const setupSleep = recorder.beginWait('sleep', 'setup sleep');
    advance(30);
    setupSleep();
    runner.emit('hook end', setupHook);

    const test = createRunnable('test body');
    runner.emit('test', test);
    const hooks = ['before each 1', 'before each 2'].map((title) => ({
      ...createRunnable(title, 'shared_setup.ts'),
      parent: suite,
    }));
    suite._beforeEach.push(...hooks);
    for (const hook of hooks) {
      runner.emit('hook', hook);
      const sleep = recorder.beginWait('sleep', 'hook sleep');
      advance(10);
      sleep();
      runner.emit('hook end', hook);
    }
    const sleep = recorder.beginWait('sleep', 'test sleep');
    advance(5);
    sleep();
    runner.emit('test end', test);
    runner.emit('end');

    const report = recorder.getReport();
    expect(report.runnables.map(({ type, durationMs }) => ({ type, durationMs }))).toEqual([
      { type: 'hook', durationMs: 30 },
      { type: 'hook', durationMs: 10 },
      { type: 'hook', durationMs: 10 },
      { type: 'test', durationMs: 5 },
    ]);
    expect(report.files).toEqual([
      expect.objectContaining({ file: 'shared_setup.ts', durationMs: 50, waitMs: 50 }),
      expect.objectContaining({ file: 'example.ts', durationMs: 5, waitMs: 5 }),
    ]);
    expect(new Set(report.runnables.map(({ id }) => id)).size).toBe(4);
  });

  it('keeps failed attempts and successful retries as separate runs', () => {
    const { runner, recorder, advance } = setup();
    const failed = createRunnable('test', 'example.ts', true);
    runner.emit('test', failed);
    advance(10);
    runner.emit('retry', failed);
    const passed = createRunnable('test');
    runner.emit('test', passed);
    advance(20);
    runner.emit('test end', passed);
    runner.emit('end');
    expect(
      recorder.getReport().runnables.map(({ result, durationMs }) => ({ result, durationMs }))
    ).toEqual([
      { result: 'failed', durationMs: 10 },
      { result: 'passed', durationMs: 20 },
    ]);
  });

  it('keeps failed hooks even when Mocha does not emit hook end', () => {
    const { runner, recorder, advance } = setup();
    const hook = createRunnable('before all', 'shared_setup.ts', true);
    runner.emit('hook', hook);
    const finish = recorder.beginWait('webdriverWait', 'driver.wait');
    advance(10);
    runner.emit('fail', hook, new Error('timeout'));
    runner.emit('end');
    finish();
    expect(recorder.getReport().runnables).toEqual([
      expect.objectContaining({ type: 'hook', result: 'failed', durationMs: 10, waitMs: 10 }),
    ]);
  });

  it('retains runtime-skipped test waits without creating spans for unstarted pending tests', () => {
    const { runner, recorder, advance } = setup();
    const test = { ...createRunnable('runtime skip'), isPending: () => true };
    runner.emit('test', test);
    const finish = recorder.beginWait('sleep', 'sleep before skip');
    advance(11);
    finish();
    runner.emit('pending', test);
    runner.emit('test end', test);
    const hook = createRunnable('after each');
    runner.emit('hook', hook);
    advance(1);
    runner.emit('hook end', hook);
    runner.emit('test end', { ...createRunnable('declared pending'), isPending: () => true });
    runner.emit('end');

    const report = recorder.getReport();
    expect(report.result).toBe('passed');
    expect(report.runnables).toEqual([
      expect.objectContaining({ type: 'test', result: 'skipped', durationMs: 11, waitMs: 11 }),
      expect.objectContaining({ type: 'hook', result: 'passed', durationMs: 1, waitMs: 0 }),
    ]);
    expect(report.waits[0].runnableId).toBe(report.runnables[0].id);
    expect(report.files[0]).toMatchObject({ file: 'example.ts', waitMs: 11 });
  });

  it('clips scope totals and closes unfinished waits at shutdown', () => {
    const { runner, recorder, advance } = setup();
    const first = createRunnable('first');
    runner.emit('test', first);
    const finish = recorder.beginWait('sleep', 'unawaited sleep');
    advance(10);
    runner.emit('test end', first);
    runner.emit('test', createRunnable('second'));
    advance(10);
    runner.emit('end');
    advance(100);
    finish();
    const report = recorder.getReport();
    expect(report.durationMs).toBe(20);
    expect(report.runnables.map(({ waitMs }) => waitMs)).toEqual([10, 0]);
    expect(report.waits[0]).toMatchObject({ endMs: 20, completed: false });
    expect(report.runnables[1].result).toBe('interrupted');
    expect(report.result).toBe('interrupted');
  });

  it('preserves callback results and errors with recording enabled or disabled', async () => {
    const { runner, recorder, advance } = setup();
    const lifecycle = new Lifecycle(new ToolingLog());
    const error = new Error('original failure');
    await expect(lifecycle.recordWait('sleep', 'disabled', async () => 42)).resolves.toBe(42);
    await expect(
      lifecycle.recordWait('sleep', 'disabled', async () => {
        throw error;
      })
    ).rejects.toBe(error);
    expect(recorder.getReport().waits).toHaveLength(0);
    lifecycle.waitRecorder = recorder;
    runner.emit('test', createRunnable('failure'));
    await expect(
      lifecycle.recordWait('sleep', 'enabled', async () => {
        advance(10);
        throw error;
      })
    ).rejects.toBe(error);
    runner.emit('test end', createRunnable('failure', 'example.ts', true));
    runner.emit('end');
    expect(recorder.getReport().waits[0]).toMatchObject({ completed: true, endMs: 10 });
  });

  it('ignores definition time and emits a Chrome trace with numeric thread ids', () => {
    const runner = Object.assign(new EventEmitter(), {
      abort: jest.fn(),
      uncaught: jest.fn(),
      failures: 0,
    });
    const recorder = new WaitRecorder(join(REPO_ROOT, 'config.ts'), () => 0);
    const finish = recorder.beginWait('sleep', 'definition');
    finish();
    expect(recorder.getReport().waits).toHaveLength(0);
    const directory = mkdtempSync(join(tmpdir(), 'ftr-wait-recorder-'));
    try {
      expect(recorder.write(directory)).toBeUndefined();
      recorder.attach(runner);
      runner.emit('start');
      runner.emit('test', createRunnable('test'));
      runner.emit('test end', createRunnable('test'));
      runner.emit('end');
      expect(recorder.write(directory)).toBe(join(directory, 'waits.json'));
      const trace: { traceEvents: Array<{ ph: string; tid: number }> } = JSON.parse(
        readFileSync(join(directory, 'trace.json'), 'utf8')
      );
      expect(trace.traceEvents).toEqual([expect.objectContaining({ ph: 'X', tid: 0 })]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
