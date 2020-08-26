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
import { maybeTeamAssign, whichIndex } from '../ingest_helpers';
import {
  TOTALS_INDEX,
  RESEARCH_TOTALS_INDEX,
  RESEARCH_COVERAGE_INDEX,
  // COVERAGE_INDEX,
} from '../constants';

describe(`Ingest Helper fns`, () => {
  describe(`whichIndex`, () => {
    describe(`against the research job`, () => {
      const whichIndexAgainstResearchJob = whichIndex(true);
      describe(`against the totals index`, () => {
        const isTotal = true;
        it(`should return the Research Totals Index`, () => {
          const actual = whichIndexAgainstResearchJob(isTotal);
          expect(actual).to.be(RESEARCH_TOTALS_INDEX);
        });
      });
      describe(`against the coverage index`, () => {
        it(`should return the Research Totals Index`, () => {
          const isTotal = false;
          const actual = whichIndexAgainstResearchJob(isTotal);
          expect(actual).to.be(RESEARCH_COVERAGE_INDEX);
        });
      });
    });
    describe(`against the "prod" job`, () => {
      const whichIndexAgainstProdJob = whichIndex(false);
      describe(`against the totals index`, () => {
        const isTotal = true;
        it(`should return the "Prod" Totals Index`, () => {
          const actual = whichIndexAgainstProdJob(isTotal);
          expect(actual).to.be(TOTALS_INDEX);
        });
      });
    });
  });
  describe(`maybeTeamAssign`, () => {
    describe(`against a coverage index`, () => {
      it(`should have the pipeline prop`, () => {
        const actual = maybeTeamAssign(true, { a: 'blah' });
        expect(actual).to.have.property('pipeline');
      });
    });
    describe(`against a totals index`, () => {
      describe(`for "prod"`, () => {
        it(`should not have the pipeline prop`, () => {
          const actual = maybeTeamAssign(false, { b: 'blah' });
          expect(actual).not.to.have.property('pipeline');
        });
      });
    });
  });
});
