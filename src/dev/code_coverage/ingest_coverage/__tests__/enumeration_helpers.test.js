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
import { tryPath } from '../team_assignment/enumeration_helpers';

describe(`enumeration helper fns`, () => {
  describe(`tryPath`, () => {
    describe(`w/o glob file paths`, () => {
      it(`should return a right on an existing path`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/ingest.js';
        const actual = tryPath(aPath);
        expect(actual.isRight()).to.be(true);
      });
      it(`should return a left on a non existing path`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/does_not_exist.js';
        const actual = tryPath(aPath);
        expect(actual.isLeft()).to.be(true);
      });
    });
    describe(`with glob file paths`, () => {
      it(`should not error when the glob expands to nothing, but instead return a Left`, () => {
        const aPath = 'src/legacy/core_plugins/kibana/public/home/*.ts';
        const actual = tryPath(aPath);
        expect(actual.isLeft()).to.be(true);
      });
      it(`should return a right on a glob that does indeed expand`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/*.js';
        const actual = tryPath(aPath);
        expect(actual.isRight()).to.be(true);
      });
    });
  });
});
