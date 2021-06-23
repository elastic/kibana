/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      'node',
      [
        '--preserve-symlinks',
        './node_modules/.bin/jest',
        '--config',
        'packages/kbn-test/src/jest/integration_tests/__fixtures__/jest.config.js',
      ],
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
