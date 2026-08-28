/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { EsVersion, FunctionalTestRunner, readConfigFile } from '..';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const BASIC_CONFIG = require.resolve('./__fixtures__/simple_project/config.js');
const SKIPPED_CONFIG = require.resolve('./__fixtures__/skipped_project/config.js');

describe('basic config file with a single app and test', function () {
  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', BASIC_CONFIG], {
      // this FTR run should not produce a scout report
      env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
    });
    const stdout = proc.stdout.toString('utf8');
    expect(stdout).toContain('$BEFORE$');
    expect(stdout).toContain('$TESTNAME$');
    expect(stdout).toContain('$INTEST$');
    expect(stdout).toContain('$AFTER$');
  });

  it('discovers tests skipped directly and by a parent suite', async () => {
    const config = await readConfigFile(new ToolingLog(), EsVersion.getDefault(), SKIPPED_CONFIG);
    const runner = new FunctionalTestRunner(new ToolingLog(), config, EsVersion.getDefault());

    await expect(runner.getSkippedTests()).resolves.toEqual([
      {
        file: require.resolve('./__fixtures__/skipped_project/tests.js'),
        suite: 'skips',
        test: 'directly skipped',
      },
      {
        file: require.resolve('./__fixtures__/skipped_project/tests.js'),
        suite: 'skips > skipped suite',
        test: 'skipped by suite',
      },
    ]);
  });
});
