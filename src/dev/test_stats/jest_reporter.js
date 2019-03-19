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
const ROOT_DIR = dirname(require.resolve('../../../package.json'));
const JEST_PKG = require('jest/package.json');

/**
 * Jest reporter that produces JUnit report when running on CI
 * @class JestJUnitReporter
 */
export default class TestStatsReporter {
  constructor(_, options = {}) {
    const {
      reportName = 'Jest Tests',
      rootDirectory = ROOT_DIR
    } = options;

    this._reportName = reportName;
    this._rootDirectory = resolve(rootDirectory);
  }

  /**
   * Called by jest when all tests complete
   * @param {Object} contexts
   * @param {JestResults} results see https://facebook.github.io/jest/docs/en/configuration.html#testresultsprocessor-string
   * @return {undefined}
   */
  onRunComplete(_, results) {
    if (!process.env.CI || !results.testResults.length) {
      return;
    }

    const path = resolve(this._rootDirectory, `target/junit/test-summary.ndjson`);
    mkdirp.sync(dirname(path));
    writeFileSync(
      path,
      JSON.stringify({
        name: this._reportName,
        jest: JEST_PKG.version,
        rootDirectory: this._rootDirectory,
        ...results,
        testResults: results.testResults.map(result => ({
          ...result,
          testFilePath: relative(this._rootDirectory, result.testFilePath)
        }))
      }) + '\n',
      { encoding: 'utf8', flag: 'a' }
    );
  }
}
