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
import { readFileSync } from 'fs';

import { fromNode as fcb } from 'bluebird';
import { parseString } from 'xml2js';
import del from 'del';
import Mocha from 'mocha';
import expect from '@kbn/expect';
import { makeJunitReportPath } from '@kbn/test';

import { setupJUnitReportGeneration } from '../junit_report_generation';

const PROJECT_DIR = resolve(__dirname, 'fixtures/project');
const DURATION_REGEX = /^\d+\.\d{3}$/;
const ISO_DATE_SEC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

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
    const report = await fcb((cb) =>
      parseString(readFileSync(makeJunitReportPath(PROJECT_DIR, 'test')), cb)
    );

    // test case results are wrapped in <testsuites></testsuites>
    expect(report).to.eql({
      testsuites: {
        testsuite: [report.testsuites.testsuite[0]],
      },
    });

    // the single <testsuite> element at the root contains summary data for all tests results
    const [testsuite] = report.testsuites.testsuite;
    expect(testsuite.$.time).to.match(DURATION_REGEX);
    expect(testsuite.$.timestamp).to.match(ISO_DATE_SEC_REGEX);
    expect(testsuite).to.eql({
      $: {
        failures: '2',
        skipped: '1',
        tests: '4',
        time: testsuite.$.time,
        timestamp: testsuite.$.timestamp,
      },
      testcase: testsuite.testcase,
    });

    // there are actually only three tests, but since the hook failed
    // it is reported as a test failure
    expect(testsuite.testcase).to.have.length(4);
    const [testPass, testFail, beforeEachFail, testSkipped] = testsuite.testcase;

    const sharedClassname = testPass.$.classname;
    expect(sharedClassname).to.match(/^test\.test[^\.]js$/);
    expect(testPass.$.time).to.match(DURATION_REGEX);
    expect(testPass).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE works',
        time: testPass.$.time,
        'metadata-json': '{}',
      },
      'system-out': testPass['system-out'],
    });

    expect(testFail.$.time).to.match(DURATION_REGEX);
    expect(testFail.failure[0]).to.match(/Error: FORCE_TEST_FAIL\n.+fixtures.project.test.js/);
    expect(testFail).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE fails',
        time: testFail.$.time,
        'metadata-json': '{}',
      },
      'system-out': testFail['system-out'],
      failure: [testFail.failure[0]],
    });

    expect(beforeEachFail.$.time).to.match(DURATION_REGEX);
    expect(beforeEachFail.failure).to.have.length(1);
    expect(beforeEachFail.failure[0]).to.match(
      /Error: FORCE_HOOK_FAIL\n.+fixtures.project.test.js/
    );
    expect(beforeEachFail).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE SUB_SUITE "before each" hook: fail hook for "never runs"',
        time: beforeEachFail.$.time,
        'metadata-json': '{}',
      },
      'system-out': testFail['system-out'],
      failure: [beforeEachFail.failure[0]],
    });

    expect(testSkipped).to.eql({
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
