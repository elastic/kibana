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


import expect from '@kbn/expect';
import { spawn } from "child_process";
import { resolve } from "path";

const ROOT_DIR = resolve(__dirname, '../../../../..');
const MOCKS_DIR = resolve(__dirname, './mocks')

describe('Ingest Coverage to Cluster', () => {

  beforeAll(done => {
    const coverageSummaryPath = resolve(MOCKS_DIR, 'jest-combined/coverage-summary.json');
    const args = [
      'scripts/ingest_coverage.js',
      '--verbose',
      '--path',
      coverageSummaryPath
    ];

    // BUILD_ID=407
    // ES_HOST=https://super:changeme@142fea2d3047486e925eb8b223559cae.europe-west1.gcp.cloud.es.io:9243
    // STATIC_SITE_URL_BASE=https://kibana-coverage.elastic.dev/jobs/elastic+kibana+code-coverage
    // TIME_STAMP=2020-03-02T21:11:47Z
    // CI_RUN_URL=https://kibana-ci.elastic.co/job/elastic+kibana+code-coverage/407/
    const create = spawn(process.execPath, args, {
      cwd: ROOT_DIR,
      env: {
        BUILD_ID: 407,
        CI_RUN_URL: 'https://kibana-ci.elastic.co/job/elastic+kibana+code-coverage/407/',
        STATIC_SITE_URL_BASE: 'https://kibana-coverage.elastic.dev/jobs/elastic+kibana+code-coverage',
        TIME_STAMP: '2020-03-02T21:11:47Z',
        ES_HOST: 'https://super:changeme@142fea2d3047486e925eb8b223559cae.europe-west1.gcp.cloud.es.io:9243',
        NODE_ENV: 'integration_test',
        // NODE_ENV: 'prod',
      }
    });
    create.stdout.on('data', function onData(x) {

      console.log(`\n### x: \n\t${x}`);


    });
    create.on('close', done);
  });


  it('should blah blah blah', function() {
    expect(true).to.be(true);
  });
});
