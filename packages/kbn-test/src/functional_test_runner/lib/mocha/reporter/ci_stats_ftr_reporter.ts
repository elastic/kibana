/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import {
  CiStatsReporter,
  CiStatsReportTestsOptions,
  CiStatsTestType,
} from '@kbn/ci-stats-reporter';

import { Config } from '../../config';
import { Runner } from '../../../fake_mocha_types';
import { TestMetadata, ScreenshotRecord } from '../../test_metadata';
import { Lifecycle } from '../../lifecycle';
import { getSnapshotOfRunnableLogs } from '../../../../mocha';

interface Suite {
  _beforeAll: Runnable[];
  _beforeEach: Runnable[];
  _afterEach: Runnable[];
  _afterAll: Runnable[];
}

interface Runnable {
  isFailed(): boolean;
  isPending(): boolean;
  duration?: number;
  titlePath(): string[];
  file: string;
  title: string;
  parent: Suite;
  _screenshots?: ScreenshotRecord[];
}

function getHookType(hook: Runnable): CiStatsTestType {
  if (hook.parent._afterAll.includes(hook)) {
    return 'after all hook';
  }
  if (hook.parent._afterEach.includes(hook)) {
    return 'after each hook';
  }
  if (hook.parent._beforeEach.includes(hook)) {
    return 'before each hook';
  }
  if (hook.parent._beforeAll.includes(hook)) {
    return 'before all hook';
  }

  throw new Error(`unable to determine hook type, hook is not owned by it's parent`);
}

export function setupCiStatsFtrTestGroupReporter({
  config,
  lifecycle,
  runner,
  testMetadata,
  reporter,
}: {
  config: Config;
  lifecycle: Lifecycle;
  runner: Runner;
  testMetadata: TestMetadata;
  reporter: CiStatsReporter;
}) {
  let startMs: number | undefined;
  runner.on('start', () => {
    startMs = Date.now();
  });

  const start = Date.now();
  const group: CiStatsReportTestsOptions['group'] = {
    startTime: new Date(start).toJSON(),
    durationMs: 0,
    type: config.path.startsWith('x-pack') ? 'X-Pack Functional Tests' : 'Functional Tests',
    name: Path.relative(REPO_ROOT, config.path),
    meta: {
      ciGroup: config.get('suiteTags.include').find((t: string) => t.startsWith('ciGroup')),
      tags: [
        ...config.get('suiteTags.include'),
        ...config.get('suiteTags.exclude').map((t: string) => `-${t}`),
      ].filter((t) => !t.startsWith('ciGroup')),
    },
  };

  const testRuns: CiStatsReportTestsOptions['testRuns'] = [];
  function trackRunnable(
    runnable: Runnable,
    { error, type }: { error?: Error; type: CiStatsTestType }
  ) {
    testRuns.push({
      startTime: new Date(Date.now() - (runnable.duration ?? 0)).toJSON(),
      durationMs: runnable.duration ?? 0,
      seq: testRuns.length + 1,
      file: Path.relative(REPO_ROOT, runnable.file),
      name: runnable.title,
      suites: runnable.titlePath().slice(0, -1),
      result: runnable.isFailed() ? 'fail' : runnable.isPending() ? 'skip' : 'pass',
      type,
      error: error?.stack,
      stdout: getSnapshotOfRunnableLogs(runnable),
      screenshots: testMetadata.getScreenshots(runnable).map((s) => ({
        base64Png: s.base64Png,
        name: s.name,
      })),
    });
  }

  const errors = new Map<Runnable, Error>();
  runner.on('fail', (test: Runnable, error: Error) => {
    errors.set(test, error);
  });

  runner.on('hook end', (hook: Runnable) => {
    if (hook.isFailed()) {
      const error = errors.get(hook);
      if (!error) {
        throw new Error(`no error recorded for failed hook`);
      }

      trackRunnable(hook, {
        type: getHookType(hook),
        error,
      });
    }
  });

  runner.on('test end', (test: Runnable) => {
    const error = errors.get(test);
    if (test.isFailed() && !error) {
      throw new Error('no error recorded for failed test');
    }

    trackRunnable(test, {
      type: 'test',
      error,
    });
  });

  runner.on('end', () => {
    if (!startMs) {
      throw new Error('startMs was not defined');
    }

    // update the durationMs
    group.durationMs = Date.now() - startMs;
  });

  lifecycle.cleanup.add(async () => {
    await reporter.reportTests({
      group,
      testRuns,
    });
  });
}
