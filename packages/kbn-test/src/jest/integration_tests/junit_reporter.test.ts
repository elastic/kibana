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

import { resolve } from 'path';
import { promisify } from 'util';
import { readFileSync } from 'fs';

import del from 'del';
import execa from 'execa';
import xml2js from 'xml2js';
import { getUniqueJunitReportPath } from '../../report_path';
import { REPO_ROOT } from '@kbn/utils';

const MINUTE = 1000 * 60;
const FIXTURE_DIR = resolve(__dirname, '__fixtures__');
const TARGET_DIR = resolve(FIXTURE_DIR, 'target');
const XML_PATH = getUniqueJunitReportPath(FIXTURE_DIR, 'JUnit Reporter Integration Test');

afterAll(async () => {
  await del(TARGET_DIR);
});

const parseXml = promisify(xml2js.parseString);
it(
  'produces a valid junit report for failures',
  async () => {
    const result = await execa(
      './node_modules/.bin/jest',
      ['--config', 'packages/kbn-test/src/jest/integration_tests/__fixtures__/jest.config.js'],
      {
        cwd: REPO_ROOT,
        env: {
          CI: 'true',
        },
        reject: false,
      }
    );

    expect(result.exitCode).toBe(1);
    await expect(parseXml(readFileSync(XML_PATH, 'utf8'))).resolves.toEqual({
      testsuites: {
        $: {
          failures: '1',
          name: 'jest',
          skipped: '0',
          tests: '1',
          time: expect.anything(),
          timestamp: expect.anything(),
        },
        testsuite: [
          {
            $: {
              failures: '1',
              file: resolve(FIXTURE_DIR, './test.js'),
              name: 'test.js',
              skipped: '0',
              tests: '1',
              time: expect.anything(),
              timestamp: expect.anything(),
            },
            testcase: [
              {
                $: {
                  classname: 'JUnit Reporter Integration Test.·',
                  name: 'JUnit Reporter fails',
                  time: expect.anything(),
                },
                failure: [expect.stringMatching(/Error: failure\s+at /m)],
              },
            ],
          },
        ],
      },
    });
  },
  3 * MINUTE
);
