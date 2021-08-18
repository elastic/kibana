/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const runAllGroups = async () => {
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
    };
    const runOneGroup = async (singleGroup) => {
      await execa(process.execPath, [
        'scripts/functional_test_runner',
        `--include-tag=${singleGroup}`,
        '--config',
        'test/functional/config.js',
        '--test-stats',
      ]);
    };

    console.log(`\n### TEST_TAGS: \n${JSON.stringify(TEST_TAGS, null, 2)}`);
    TEST_TAGS[0] === 'ciGroup99' ? await runOneGroup(TEST_TAGS[0]) : await runAllGroups();
  } catch (error) {
    log.error(error.stack);
    process.exitCode = 1;
  }
});
