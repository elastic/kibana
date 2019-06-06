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


const { readFileSync } = require('fs');
const { resolve } = require('path');

const execa = require('execa');
const jsYaml = require('js-yaml');

const ROOT_DIR = resolve(__dirname, '../../..');
const pkg = require('../../../package.json');

const { JOB } = jsYaml.safeLoad(readFileSync(resolve(ROOT_DIR, '.ci/jobs.yml'), 'utf8'));

// +2 is necessary to account for extra execution of PERCY_BIN in test/scripts/jenkins_ci_group.sh
// Remove +2 ? ld 
const ciGroupCount = JOB.filter(id => id.includes('ciGroupVisual')).length;

const { stdout: commit } = execa.sync('git', ['rev-parse', 'HEAD']);
const shortCommit = commit.slice(0, 8);

const isPr = process.env.JOB_NAME.includes('elastic+kibana+pull-request');

console.log(`export LOG_LEVEL=debug;`);
console.log(`export PERCY_PARALLEL_TOTAL="${ciGroupCount}";`);
console.log(`export PERCY_PARALLEL_NONCE="${shortCommit}/${isPr ? 'PR' : pkg.branch}/${process.env.BUILD_ID}";`);
