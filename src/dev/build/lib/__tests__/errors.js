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

import { isErrorLogged, markErrorLogged } from '../errors';

describe('dev/build/lib/errors', () => {
  describe('isErrorLogged()/markErrorLogged()', () => {
    it('returns true if error has been passed to markErrorLogged()', () => {
      const error = new Error();
      expect(isErrorLogged(error)).to.be(false);
      markErrorLogged(error);
      expect(isErrorLogged(error)).to.be(true);
    });

    describe('isErrorLogged()', () => {
      it('handles any value type', () => {
        expect(isErrorLogged(null)).to.be(false);
        expect(isErrorLogged(undefined)).to.be(false);
        expect(isErrorLogged(1)).to.be(false);
        expect(isErrorLogged([])).to.be(false);
        expect(isErrorLogged({})).to.be(false);
        expect(isErrorLogged(/foo/)).to.be(false);
        expect(isErrorLogged(new Date())).to.be(false);
      });
    });
  });
});
