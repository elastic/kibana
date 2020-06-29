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
import { makeJunitReportPath } from '@kbn/test';

const MINUTE = 1000 * 60;
const ROOT_DIR = resolve(__dirname, '../../../../');
const FIXTURE_DIR = resolve(__dirname, '__fixtures__');
const TARGET_DIR = resolve(FIXTURE_DIR, 'target');
const ENV_CI = process.env.CI;

beforeAll(() => {
  // We want JUnit report paths to be consistent for the tests. They are unique per execution in CI
  delete process.env.CI;
});

afterAll(async () => {
  await del(TARGET_DIR);
  if (ENV_CI !== undefined) {
    process.env.CI = ENV_CI;
  }
});

const parseXml = promisify(xml2js.parseString);

it(
  'produces a valid junit report for failures',
  async () => {
    const result = await execa(
      process.execPath,
      ['-r', require.resolve('../../../setup_node_env'), require.resolve('jest/bin/jest')],
      {
        cwd: FIXTURE_DIR,
        env: {
          CI: 'true',
        },
        reject: false,
      }
    );

    const xmlPath = makeJunitReportPath(FIXTURE_DIR, 'Jest Tests');

    expect(result.exitCode).toBe(1);
    await expect(parseXml(readFileSync(xmlPath, 'utf8'))).resolves.toEqual({
      testsuites: {
        $: {
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
              file: resolve(ROOT_DIR, 'src/dev/jest/integration_tests/__fixtures__/test.js'),
              name: 'test.js',
              skipped: '0',
              tests: '1',
              time: expect.anything(),
              timestamp: expect.anything(),
            },
            testcase: [
              {
                $: {
                  classname: 'Jest Tests.·',
                  name: 'fails',
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
