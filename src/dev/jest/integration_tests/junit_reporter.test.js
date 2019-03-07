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
import { createAbsolutePathSerializer } from '@kbn/dev-utils';
import xml2js from 'xml2js';

const MINUTE = 1000 * 60;
const ROOT_DIR = resolve(__dirname, '../../../../');
const FIXTURE_DIR = resolve(__dirname, '__fixtures__');
const TARGET_DIR = resolve(FIXTURE_DIR, 'target');
const XML_PATH = resolve(TARGET_DIR, 'junit/TEST-Jest Tests.xml');

expect.addSnapshotSerializer(
  createAbsolutePathSerializer(ROOT_DIR, {
    global: true,
  })
);

afterAll(async () => {
  await del(TARGET_DIR);
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

    expect(result.code).toBe(1);
    await expect(parseXml(readFileSync(XML_PATH, 'utf8'))).resolves.toMatchInlineSnapshot(`
Object {
  "testsuites": Object {
    "$": Object {
      "name": "jest",
      "skipped": "0",
      "tests": "1",
      "time": "0.735",
      "timestamp": "2019-03-07T19:19:57",
    },
    "testsuite": Array [
      Object {
        "$": Object {
          "failures": "1",
          "file": "<absolute path>/src/dev/jest/integration_tests/__fixtures__/test.js",
          "name": "test.js",
          "skipped": "0",
          "tests": "1",
          "time": "0.340",
          "timestamp": "2019-03-07T19:19:58",
        },
        "testcase": Array [
          Object {
            "$": Object {
              "classname": "Jest Tests.·",
              "name": "fails",
              "time": "0.002",
            },
            "failure": Array [
              "
        Error: failure
    at Object.<anonymous>.it (<absolute path>/src/dev/jest/integration_tests/__fixtures__/test.js:21:9)
    at Object.asyncJestTest (<absolute path>/node_modules/jest-jasmine2/build/jasmineAsyncInstall.js:102:37)
    at resolve (<absolute path>/node_modules/jest-jasmine2/build/queueRunner.js:41:12)
    at new Promise (<anonymous>)
    at mapper (<absolute path>/node_modules/jest-jasmine2/build/queueRunner.js:26:19)
    at promise.then (<absolute path>/node_modules/jest-jasmine2/build/queueRunner.js:71:41)
      ",
            ],
          },
        ],
      },
    ],
  },
}
`);
  },
  3 * MINUTE
);
