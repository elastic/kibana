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
import { ciRunUrl, coveredFilePath, itemizeVcs, prokPrevious } from '../transforms';

describe(`Transform fn`, () => {
  describe(`ciRunUrl`, () => {
    it(`should add the url when present in the environment`, () => {
      process.env.CI_RUN_URL = 'blah';
      expect(ciRunUrl()).to.have.property('ciRunUrl', 'blah');
    });
    it(`should not include the url if not present in the environment`, () => {
      process.env.CI_RUN_URL = void 0;
      expect(ciRunUrl({ a: 'a' })).not.to.have.property('ciRunUrl');
    });
  });
  describe(`coveredFilePath`, () => {
    describe(`in the code-coverage job`, () => {
      it(`should remove the jenkins workspace path`, () => {
        const obj = {
          staticSiteUrl:
            '/var/lib/jenkins/workspace/elastic+kibana+code-coverage/kibana/x-pack/plugins/reporting/server/browsers/extract/unzip.js',
          COVERAGE_INGESTION_KIBANA_ROOT:
            '/var/lib/jenkins/workspace/elastic+kibana+code-coverage/kibana',
        };
        expect(coveredFilePath(obj)).to.have.property(
          'coveredFilePath',
          'x-pack/plugins/reporting/server/browsers/extract/unzip.js'
        );
      });
    });
    describe(`in the qa research job`, () => {
      it(`should remove the jenkins workspace path`, () => {
        const obj = {
          staticSiteUrl:
            '/var/lib/jenkins/workspace/elastic+kibana+qa-research/kibana/x-pack/plugins/reporting/server/browsers/extract/unzip.js',
          COVERAGE_INGESTION_KIBANA_ROOT:
            '/var/lib/jenkins/workspace/elastic+kibana+qa-research/kibana',
        };
        expect(coveredFilePath(obj)).to.have.property(
          'coveredFilePath',
          'x-pack/plugins/reporting/server/browsers/extract/unzip.js'
        );
      });
    });
  });
  describe(`prokPrevious`, () => {
    const comparePrefixF = () => 'https://github.com/elastic/kibana/compare';
    process.env.FETCHED_PREVIOUS = 'A';
    it(`should return a previous compare url`, () => {
      const actual = prokPrevious(comparePrefixF)('B');
      expect(actual).to.be(`https://github.com/elastic/kibana/compare/A...B`);
    });
  });
  describe(`itemizeVcs`, () => {
    it(`should return a sha url`, () => {
      const vcsInfo = [
        'origin/ingest-code-coverage',
        'f07b34f6206',
        `Tre' Seymour`,
        `Lorem :) ipsum Tre' λ dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
      ];
      expect(itemizeVcs(vcsInfo)({}).vcs).to.have.property(
        'vcsUrl',
        `https://github.com/elastic/kibana/commit/${vcsInfo[1]}`
      );
    });
  });
});
