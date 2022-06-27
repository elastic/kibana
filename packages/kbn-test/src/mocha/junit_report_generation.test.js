/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { promisify } from 'util';

import { parseString } from 'xml2js';
import del from 'del';
import Mocha from 'mocha';
import { getUniqueJunitReportPath } from '../report_path';

import { setupJUnitReportGeneration } from './junit_report_generation';

const PROJECT_DIR = resolve(__dirname, '__fixtures__/project');
const DURATION_REGEX = /^\d+\.\d{3}$/;
const ISO_DATE_SEC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const XML_PATH = getUniqueJunitReportPath(PROJECT_DIR, 'test');

const parseStringAsync = promisify(parseString);

describe('dev/mocha/junit report generation', () => {
  afterEach(() => {
    del.sync(resolve(PROJECT_DIR, 'target'));
  });

  it('reports on failed setup hooks', async () => {
    const mocha = new Mocha({
      reporter: function Runner(runner) {
        setupJUnitReportGeneration(runner, {
          reportName: 'test',
          rootDirectory: PROJECT_DIR,
        });
      },
    });

    mocha.addFile(resolve(PROJECT_DIR, 'test.js'));
    await new Promise((resolve) => mocha.run(resolve));
    const report = await parseStringAsync(await readFile(XML_PATH));

    // test case results are wrapped in <testsuites></testsuites>
    expect(report).toEqual({
      testsuites: {
        testsuite: [report.testsuites.testsuite[0]],
      },
    });

    // the single <testsuite> element at the root contains summary data for all tests results
    const [testsuite] = report.testsuites.testsuite;
    expect(testsuite.$.time).toMatch(DURATION_REGEX);
    expect(testsuite.$.timestamp).toMatch(ISO_DATE_SEC_REGEX);
    expect(testsuite).toEqual({
      $: {
        failures: '2',
        name: 'test',
        skipped: '1',
        tests: '4',
        time: testsuite.$.time,
        timestamp: testsuite.$.timestamp,
      },
      testcase: testsuite.testcase,
    });

    // there are actually only three tests, but since the hook failed
    // it is reported as a test failure
    expect(testsuite.testcase).toHaveLength(4);
    const [testPass, testFail, beforeEachFail, testSkipped] = testsuite.testcase;

    const sharedClassname = testPass.$.classname;
    expect(sharedClassname).toMatch(/^test\.test[^\.]js$/);
    expect(testPass.$.time).toMatch(DURATION_REGEX);
    expect(testPass).toEqual({
      $: {
        classname: sharedClassname,
        name: 'SUITE works',
        time: testPass.$.time,
        'metadata-json': '{}',
      },
      'system-out': testPass['system-out'],
    });

    expect(testFail.$.time).toMatch(DURATION_REGEX);

    expect(testFail.failure[0]).toMatch(/Error: FORCE_TEST_FAIL/);
    expect(testFail).toEqual({
      $: {
        classname: sharedClassname,
        name: 'SUITE fails',
        time: testFail.$.time,
        'metadata-json': '{}',
      },
      'system-out': testFail['system-out'],
      failure: [testFail.failure[0]],
    });

    expect(beforeEachFail.$.time).toMatch(DURATION_REGEX);
    expect(beforeEachFail.failure).toHaveLength(1);
    expect(beforeEachFail.failure[0]).toMatch(/Error: FORCE_HOOK_FAIL/);
    expect(beforeEachFail).toEqual({
      $: {
        classname: sharedClassname,
        name: 'SUITE SUB_SUITE "before each" hook: fail hook for "never runs"',
        time: beforeEachFail.$.time,
        'metadata-json': '{}',
      },
      'system-out': testFail['system-out'],
      failure: [beforeEachFail.failure[0]],
    });

    expect(testSkipped).toEqual({
      $: {
        classname: sharedClassname,
        name: 'SUITE SUB_SUITE never runs',
        'metadata-json': '{}',
      },
      'system-out': ['-- logs are only reported for failed tests --'],
      skipped: [''],
    });
  });
});
