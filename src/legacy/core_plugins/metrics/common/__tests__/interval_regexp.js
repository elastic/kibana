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
import { expect } from 'chai';
import { GTE_INTERVAL_RE, INTERVAL_STRING_RE } from '../interval_regexp';

describe('interval_regexp', () => {

  describe('GTE_INTERVAL_RE', () => {
    it('returns true for">=12h"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).to.be.true;
    });
    it('returns true for ">=1y"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).to.be.true;
    });
    it('returns true for ">=25m"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).to.be.true;
    });
    it('returns false "auto"', () => {
      const value = GTE_INTERVAL_RE.test('auto');

      expect(value).to.be.false;
    });
    it('returns false "wrongInput"', () => {
      const value = GTE_INTERVAL_RE.test('wrongInput');

      expect(value).to.be.false;
    });
    it('returns false "d"', () => {
      const value = GTE_INTERVAL_RE.test('d');

      expect(value).to.be.false;
    });

    it('returns false "y"', () => {
      const value = GTE_INTERVAL_RE.test('y');

      expect(value).to.be.false;
    });
  });

  describe('INTERVAL_STRING_RE', () => {
    it('returns true for "8d"', () => {
      const value = INTERVAL_STRING_RE.test('8d');

      expect(value).to.be.true;
    });
    it('returns true for "1y"', () => {
      const value = INTERVAL_STRING_RE.test('1y');

      expect(value).to.be.true;
    });
    it('returns true for "6M"', () => {
      const value = INTERVAL_STRING_RE.test('6M');

      expect(value).to.be.true;
    });
    it('returns false "auto"', () => {
      const value = INTERVAL_STRING_RE.test('auto');

      expect(value).to.be.false;
    });
    it('returns false "wrongInput"', () => {
      const value = INTERVAL_STRING_RE.test('wrongInput');

      expect(value).to.be.false;
    });
    it('returns false for">=21h"', () => {
      const value = INTERVAL_STRING_RE.test('>=21h');

      expect(value).to.be.false;
    });
  });
});
