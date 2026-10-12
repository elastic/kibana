/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { WaitRecorder } from '../lib/wait_recorder';

type Report = ReturnType<WaitRecorder['getReport']>;

it.each(['0', '1'])(
  'respects FTR_RECORD_WAITS=%s for a config without recording options',
  (enabled) => {
    const directory = mkdtempSync(join(tmpdir(), 'ftr-wait-integration-'));
    const configPath = require.resolve('./__fixtures__/wait_recording/config');
    try {
      const proc = spawnSync(
        process.execPath,
        [join(REPO_ROOT, 'scripts/functional_test_runner.js'), '--config', configPath],
        {
          env: {
            ...process.env,
            SCOUT_REPORTER_ENABLED: '0',
            FTR_RECORD_WAITS: enabled,
            FTR_WAIT_RECORDING_DIRECTORY: directory,
          },
          timeout: 30_000,
          encoding: 'utf8',
        }
      );
      expect(proc.error).toBeUndefined();
      if (proc.status !== 0) throw new Error(proc.stdout + proc.stderr);
      if (enabled === '0') {
        expect(readdirSync(directory)).toHaveLength(0);
        return;
      }
      const configDirectory = join(directory, relative(REPO_ROOT, configPath));
      const recordings = readdirSync(configDirectory);
      expect(recordings).toHaveLength(1);
      const report: Report = JSON.parse(
        readFileSync(join(configDirectory, recordings[0], 'waits.json'), 'utf8')
      );
      expect(report.result).toBe('passed');
      expect(report.runnables.filter(({ type }) => type === 'test')).toEqual([
        expect.objectContaining({
          title: 'wait recording integration > first test',
          result: 'passed',
        }),
        expect.objectContaining({
          title: 'wait recording integration > runtime-skipped test',
          result: 'skipped',
        }),
        expect.objectContaining({
          title: 'wait recording integration > second test',
          result: 'passed',
        }),
      ]);
      expect(report.waits).toHaveLength(10);
      for (const span of report.waits) {
        const owner = report.runnables.find(({ id }) => id === span.runnableId);
        expect(owner?.type).toBe(span.name.includes('test sleep') ? 'test' : 'hook');
        expect(span.completed).toBe(true);
        expect(span.endMs - span.startMs).toBeGreaterThan(0);
      }
      expect(report.files).toHaveLength(2);
      const testFile = report.files.find(({ file }) => file.endsWith('/wait_recording/tests.ts'));
      expect(testFile?.waitMs).toBeCloseTo(report.waitMs);
      expect(report.runnables.every(({ durationMs, waitMs }) => waitMs <= durationMs)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
);
