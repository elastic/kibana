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

import { resolve, dirname, relative } from 'path';
import { writeFileSync } from 'fs';

import mkdirp from 'mkdirp';
import xmlBuilder from 'xmlbuilder';

import { escapeCdata } from '../xml';

const ROOT_DIR = dirname(require.resolve('../../../package.json'));

/**
 * Jest reporter that produces JUnit report when running on CI
 * @class JestJUnitReporter
 */
export default class JestJUnitReporter {
  constructor(globalConfig, options = {}) {
    const {
      reportName = 'Jest Tests',
      rootDirectory = ROOT_DIR
    } = options;

    this._reportName = reportName;
    this._rootDirectory = rootDirectory;
  }

  /**
   * Called by jest when all tests complete
   * @param {Object} contexts
   * @param {JestResults} results see https://facebook.github.io/jest/docs/en/configuration.html#testresultsprocessor-string
   * @return {undefined}
   */
  onRunComplete(contexts, results) {
    if (!process.env.CI) {
      return;
    }

    const reportName = this._reportName;
    const rootDirectory = this._rootDirectory;
    const root = xmlBuilder.create(
      'testsuites',
      { encoding: 'utf-8' },
      {},
      { skipNullAttributes: true }
    );

    const msToIso = ms => ms ? new Date(ms).toISOString().slice(0, -5) : undefined;
    const msToSec = ms => ms ? (ms / 1000).toFixed(3) : undefined;

    root.att({
      name: 'jest',
      timestamp: msToIso(results.startTime),
      time: msToSec(Date.now() - results.startTime),
      tests: results.numTotalTests,
      failures: results.numFailedTests,
      skipped: results.numPendingTests,
    });

    // top level test results are the files/suites
    results.testResults.forEach(suite => {
      const suiteEl = root.ele('testsuite', {
        name: relative(rootDirectory, suite.testFilePath),
        timestamp: msToIso(suite.perfStats.start),
        time: msToSec(suite.perfStats.end - suite.perfStats.start),
        tests: suite.testResults.length,
        failures: suite.numFailedTests,
        skipped: suite.numPendingTests,
        file: suite.testFilePath
      });

      // nested in there are the tests in that file
      const relativePath = dirname(relative(rootDirectory, suite.testFilePath));
      const classname = `${reportName}.${relativePath.replace(/\./g, '·')}`;
      suite.testResults.forEach(test => {
        const testEl = suiteEl.ele('testcase', {
          classname,
          name: [...test.ancestorTitles, test.title].join(' '),
          time: msToSec(test.duration)
        });

        test.failureMessages.forEach((message) => {
          testEl.ele('failure').dat(escapeCdata(message));
        });

        if (test.status === 'pending') {
          testEl.ele('skipped');
        }
      });
    });

    const reportPath = resolve(rootDirectory, `target/junit/TEST-${reportName}.xml`);
    const reportXML = root.end({
      pretty: true,
      indent: '  ',
      newline: '\n',
      spacebeforeslash: ''
    });

    mkdirp.sync(dirname(reportPath));
    writeFileSync(reportPath, reportXML, 'utf8');
  }
}
