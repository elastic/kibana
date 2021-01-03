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
