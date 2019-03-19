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

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import pkg from '../../../package.json';

const ROOT_DIR = resolve(__dirname, '../../../');

function TestStatsReporter() {
  const specs = [];

  // const logs = [];
  // this.onBrowserLog = (browser, msg, type) => {
  //   logs.push([type, msg]);
  // };

  this.onSpecComplete = (_, result) => {
    specs.push(result);
  };

  this.onRunComplete = (_, results) => {
    writeFileSync(
      resolve(ROOT_DIR, 'target/junit/test-summary.ndjson'),
      JSON.stringify({
        name: 'karma',
        karma: pkg.devDependencies.karma,
        rootDirectory: ROOT_DIR,
        ...results,
        specs,
      }) + '\n',
      { encoding: 'utf8', flag: 'a' }
    );
  };
}

module.exports = {
  'reporter:testStats': ['type', TestStatsReporter]
};
