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

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import expect from '@kbn/expect';
import { REPO_ROOT } from '@kbn/dev-utils';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const BASIC_CONFIG = require.resolve('../fixtures/simple_project/config.js');

describe('basic config file with a single app and test', function() {
  this.timeout(60 * 1000);

  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', BASIC_CONFIG]);
    const stdout = proc.stdout.toString('utf8');
    expect(stdout).to.contain('$BEFORE$');
    expect(stdout).to.contain('$TESTNAME$');
    expect(stdout).to.contain('$INTEST$');
    expect(stdout).to.contain('$AFTER$');
  });
});
