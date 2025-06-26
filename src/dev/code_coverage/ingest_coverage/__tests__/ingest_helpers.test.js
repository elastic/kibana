/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { whichIndex } from '../ingest_helpers';
import { TOTALS_INDEX, RESEARCH_TOTALS_INDEX, RESEARCH_COVERAGE_INDEX } from '../constants';

describe(`Ingest Helper fns`, () => {
  describe(`whichIndex`, () => {
    describe(`against the research job`, () => {
      const whichIndexAgainstResearchJob = whichIndex(true);
      describe(`against the totals index`, () => {
        const isTotal = true;
        it(`should return the Research Totals Index`, () => {
          const actual = whichIndexAgainstResearchJob(isTotal);
          expect(actual).toBe(RESEARCH_TOTALS_INDEX);
        });
      });
      describe(`against the coverage index`, () => {
        it(`should return the Research Totals Index`, () => {
          const isTotal = false;
          const actual = whichIndexAgainstResearchJob(isTotal);
          expect(actual).toBe(RESEARCH_COVERAGE_INDEX);
        });
      });
    });
    describe(`against the "prod" job`, () => {
      const whichIndexAgainstProdJob = whichIndex(false);
      describe(`against the totals index`, () => {
        const isTotal = true;
        it(`should return the "Prod" Totals Index`, () => {
          const actual = whichIndexAgainstProdJob(isTotal);
          expect(actual).toBe(TOTALS_INDEX);
        });
      });
    });
  });
});
