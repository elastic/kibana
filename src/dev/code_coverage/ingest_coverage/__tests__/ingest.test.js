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
import { maybeTeamAssign } from '../ingest';
import { COVERAGE_INDEX, TOTALS_INDEX } from '../constants';

describe(`Ingest fns`, () => {
  describe(`maybeTeamAssign fn`, () => {
    describe(`against the coverage index`, () => {
      it(`should have the pipeline prop`, () => {
        expect(maybeTeamAssign(COVERAGE_INDEX, {})).to.have.property('pipeline');
      });
    });
    describe(`against the totals index`, () => {
      it(`should not have the pipeline prop`, () => {
        expect(maybeTeamAssign(TOTALS_INDEX, {})).not.to.have.property('pipeline');
      });
    });
  });
});
