/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Avoid running the CLI when importing run_llm.
jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import type { JestConfigEntry, JestPolicy, JestRunTarget } from './run_llm';
import { buildJestTask, getJestRunTargets } from './run_llm';

const createConfigEntry = (repoRel: string, type: JestConfigEntry['type']): JestConfigEntry => {
  const absPath = Path.resolve(REPO_ROOT, repoRel);
  return {
    absPath,
    repoRel: Path.relative(REPO_ROOT, absPath),
    dir: Path.dirname(absPath),
    type,
  };
};

describe('run_llm helpers', () => {
  describe('getJestRunTargets()', () => {
    it('matches changed files to the nearest jest config and marks full runs', () => {
      const parentConfig = createConfigEntry('src/dev/jest.config.js', 'unit');
      const childConfig = createConfigEntry('src/dev/subdir/jest.config.js', 'unit');

      const changedFiles = [
        'src/dev/subdir/foo.test.ts',
        'src/dev/other.test.ts',
        parentConfig.repoRel,
      ];

      const targets = getJestRunTargets(changedFiles, [parentConfig, childConfig]);

      expect(targets).toHaveLength(2);

      const childTarget = targets.find((target) => target.config.repoRel === childConfig.repoRel);
      const parentTarget = targets.find((target) => target.config.repoRel === parentConfig.repoRel);

      expect(childTarget).toBeDefined();
      expect(parentTarget).toBeDefined();

      if (!childTarget || !parentTarget) {
        throw new Error('Expected jest targets to be defined.');
      }

      expect(Array.from(childTarget.files).sort()).toEqual(['src/dev/subdir/foo.test.ts']);
      expect(childTarget.fullRun).toBe(false);

      expect(Array.from(parentTarget.files).sort()).toEqual([
        parentConfig.repoRel,
        'src/dev/other.test.ts',
      ]);
      expect(parentTarget.fullRun).toBe(true);
    });
  });

  describe('buildJestTask()', () => {
    it('builds a unit jest task with findRelatedTests and runInBand', () => {
      const config = createConfigEntry('src/dev/jest.config.js', 'unit');
      const target: JestRunTarget = {
        config,
        files: new Set(['src/dev/foo.test.ts']),
        fullRun: false,
      };
      const policy: JestPolicy = {
        passWithNoTests: true,
        testEnvironmentOptions: JSON.stringify({ globalsCleanup: 'off' }),
      };

      const task = buildJestTask(target, 1, policy);

      expect(task.command).toBe(process.execPath);
      expect(task.args).toEqual([
        '--no-experimental-require-module',
        'scripts/jest',
        '--config',
        config.repoRel,
        '--testEnvironmentOptions',
        policy.testEnvironmentOptions,
        '--runInBand',
        '--findRelatedTests',
        'src/dev/foo.test.ts',
        '--passWithNoTests',
      ]);
      expect(task.label).toBe(`Running Jest for ${config.repoRel} (findRelatedTests)...`);
    });

    it('builds an integration jest task without findRelatedTests for full runs', () => {
      const config = createConfigEntry('src/dev/jest.integration.config.js', 'integration');
      const target: JestRunTarget = {
        config,
        files: new Set(['src/dev/bar.test.ts']),
        fullRun: true,
      };
      const policy: JestPolicy = {
        passWithNoTests: true,
      };

      const task = buildJestTask(target, 4, policy);

      expect(task.args).toEqual([
        '--no-experimental-require-module',
        'scripts/jest_integration',
        '--config',
        config.repoRel,
      ]);
      expect(task.label).toBe(`Running Jest for ${config.repoRel}...`);
    });
  });
});
