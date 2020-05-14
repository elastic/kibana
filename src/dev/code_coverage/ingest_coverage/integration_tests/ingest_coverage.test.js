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
import { spawn } from 'child_process';
import { resolve } from 'path';
import { green, always } from '../utils';

import { STATIC_SITE_URL_PROP_NAME, COVERAGE_INDEX } from '../constants';

const ROOT_DIR = resolve(__dirname, '../../../../..');
const MOCKS_DIR = resolve(__dirname, './mocks');
const staticSiteUrlRegexes = {
  staticHostIncluded: /https:\/\/kibana-coverage\.elastic\.dev/,
  timeStampIncluded: /\d{4}-\d{2}-\d{2}T\d{2}.*\d{2}.*\d{2}Z/,
  folderStructureIncluded: /(?:.*|.*-combined)\//,
};
const env = {
  BUILD_ID: 407,
  CI_RUN_URL: 'https://kibana-ci.elastic.co/job/elastic+kibana+code-coverage/407/',
  STATIC_SITE_URL_BASE: 'https://kibana-coverage.elastic.dev',
  TIME_STAMP: '2020-03-02T21:11:47Z',
  ES_HOST: 'https://super:changeme@some.fake.host:9243',
  NODE_ENV: 'integration_test',
  COVERAGE_INGESTION_KIBANA_ROOT: '/var/lib/jenkins/workspace/elastic+kibana+code-coverage/kibana',
};
const includesSiteUrlPredicate = x => x.includes(STATIC_SITE_URL_PROP_NAME);
const siteUrlLines = specificLinesOnly(includesSiteUrlPredicate);
const splitByNewLine = x => x.split('\n');
const siteUrlsSplitByNewLine = siteUrlLines(splitByNewLine);
const siteUrlsSplitByNewLineWithoutBlanks = siteUrlsSplitByNewLine(notBlankLines);

describe('Ingesting Coverage to Cluster', () => {
  const verboseArgs = [
    'scripts/ingest_coverage.js',
    '--verbose',
    '--vcsInfoPath',
    'src/dev/code_coverage/ingest_coverage/integration_tests/mocks/VCS_INFO.txt',
    '--path',
  ];

  const noTotalsPath = 'jest-combined/coverage-summary-NO-total.json';
  const bothIndexesPath = 'jest-combined/coverage-summary-manual-mix.json';

  describe('with NODE_ENV set to "integration_test"', () => {
    describe(`and debug || verbose turned on`, () => {
      describe(`to the [${COVERAGE_INDEX}] index`, () => {
        const mutableCoverageIndexChunks = [];

        beforeAll(done => {
          const ingestAndMutateAsync = ingestAndMutate(done);
          const ingestAndMutateAsyncWithPath = ingestAndMutateAsync(noTotalsPath);
          const verboseIngestAndMutateAsyncWithPath = ingestAndMutateAsyncWithPath(verboseArgs);
          verboseIngestAndMutateAsyncWithPath(mutableCoverageIndexChunks);
        });

        it(
          'should result in every posted item having a site url that meets all regex assertions',
          always(
            siteUrlsSplitByNewLineWithoutBlanks(mutableCoverageIndexChunks).forEach(
              expectAllRegexesToPass({
                ...staticSiteUrlRegexes,
                endsInDotJsDotHtml: /.js.html$/,
              })
            )
          )
        );
      });
      describe(`to both indexes in the same push`, () => {
        const mutableBothIndexesChunks = [];

        beforeAll(done => {
          const ingestAndMutateAsync = ingestAndMutate(done);
          const ingestAndMutateAsyncWithPath = ingestAndMutateAsync(bothIndexesPath);
          const verboseIngestAndMutateAsyncWithPath = ingestAndMutateAsyncWithPath(verboseArgs);
          verboseIngestAndMutateAsyncWithPath(mutableBothIndexesChunks);
        });

        it(
          'should result in every posted item having a site url that meets all regex assertions',
          always(
            siteUrlsSplitByNewLineWithoutBlanks(mutableBothIndexesChunks).forEach(
              expectAllRegexesToPass(staticSiteUrlRegexes)
            )
          )
        );

        it('should result in the "just logging" message being present in the log', () => {
          expect(mutableBothIndexesChunks.some(x => x.includes('Just Logging'))).to.be(true);
        });
        it('should result in the "actually sending" message NOT being present in the log', () => {
          expect(mutableBothIndexesChunks.every(x => !x.includes('Actually sending...'))).to.be(
            true
          );
        });
        describe(`with provided vcs info file`, () => {
          const filterZero = xs => included => xs.filter(x => x.includes(included))[0];
          const filteredWith = filterZero(mutableBothIndexesChunks);
          it('should have a vcs block', () => {
            const vcs = 'vcs';
            const portion = filteredWith(vcs);
            expect(portion).to.contain(vcs);
          });
          it(`should have a branch`, () => {
            const branch = `"branch":`;
            const portion = filteredWith(branch);
            expect(portion).to.contain(branch);
            expect(portion).to.contain(`"origin/ingest-code-coverage"`);
          });
          it(`should have a sha`, () => {
            const sha = `"sha":`;
            const portion = filteredWith(sha);
            expect(portion).to.contain(sha);
            expect(portion).to.contain(`"f07b34f6206"`);
          });
          it(`should have an author`, () => {
            const author = `"author":`;
            const portion = filteredWith(author);
            expect(portion).to.contain(author);
            expect(portion).to.contain(`"Tre' Seymour"`);
          });
          it(`should have a commit msg, truncated`, () => {
            const commitMsg = `"commitMsg":`;
            const portion = filteredWith(commitMsg);
            expect(portion).to.contain(commitMsg);
            expect(portion).to.contain(`"Lorem :) ipsum Tre' λ dolor sit amet, consectetur ..."`);
          });
        });
      });
    });
  });
});

function ingestAndMutate(done) {
  return summaryPathSuffix => args => xs => {
    const coverageSummaryPath = resolve(MOCKS_DIR, summaryPathSuffix);
    const opts = [...args, coverageSummaryPath];
    const ingest = spawn(process.execPath, opts, { cwd: ROOT_DIR, env });

    ingest.stdout.on('data', x => xs.push(x + ''));
    ingest.on('close', done);
  };
}

function specificLinesOnly(predicate) {
  return splitByNewLine => notBlankLines => xs =>
    xs.filter(predicate).map(x => splitByNewLine(x).reduce(notBlankLines));
}

function notBlankLines(acc, item) {
  if (item !== '') return item;
  return acc;
}

function expectAllRegexesToPass(staticSiteUrlRegexes) {
  return urlLine =>
    Object.entries(staticSiteUrlRegexes).forEach(regexTuple => {
      if (!regexTuple[1].test(urlLine))
        throw new Error(
          `\n### ${green('FAILED')}\nAsserting: [\n\t${green(
            regexTuple[0]
          )}\n]\nAgainst: [\n\t${urlLine}\n]`
        );
    });
}
