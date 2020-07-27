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
import { fetch } from '../team_assignment/get_data';
import { noop } from '../utils';

describe(`Team Assignment`, () => {
  const mockPath = 'src/dev/code_coverage/ingest_coverage/__tests__/mocks/team_assign_mock.json';
  describe(`fetch fn`, () => {
    it(`should be a fn`, () => {
      expect(typeof fetch).to.be('function');
    });
    describe(`applied to a path that exists`, () => {
      it(`should return the contents of the path`, () => {
        const sut = fetch(mockPath);
        expect(sut.chain(JSON.parse)).to.have.property('abc');
      });
    });
    describe(`applied to an non-existing path`, () => {
      it(`should return a Left with the error message within`, () => {
        const expectLeft = (err) =>
          expect(err.message).to.contain('ENOENT: no such file or directory');

        fetch('fake_path.json').fold(expectLeft, noop);
      });
    });
  });
});
