/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

import execa from 'execa';
import { safeLoad } from 'js-yaml';

import { run } from '@kbn/dev-utils';

const JOBS_YAML = readFileSync(resolve(__dirname, '../../.ci/jobs.yml'), 'utf8');
const TEST_TAGS = safeLoad(JOBS_YAML)
  .JOB.filter((id) => id.startsWith('kibana-ciGroup'))
  .map((id) => id.replace(/^kibana-/, ''));

run(async ({ log }) => {
  try {
    const result = await execa(process.execPath, [
      'scripts/functional_test_runner',
      ...TEST_TAGS.map((tag) => `--include-tag=${tag}`),
      '--config',
      'test/functional/config.js',
      '--test-stats',
    ]);
    const stats = JSON.parse(result.stderr);

    if (stats.excludedTests.length > 0) {
      log.error(`
          ${stats.excludedTests.length} tests are excluded by the ciGroup tags, make sure that
          all test suites have a "ciGroup{X}" tag and that "tasks/functional_test_groups.js"
          knows about the tag that you are using.

          tags: ${JSON.stringify({ include: TEST_TAGS })}

          - ${stats.excludedTests.join('\n          - ')}
        `);
      process.exitCode = 1;
      return;
    }
  } catch (error) {
    log.error(error.stack);
    process.exitCode = 1;
  }
});
