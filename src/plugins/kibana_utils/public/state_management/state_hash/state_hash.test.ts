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

import { encode as encodeRison } from 'rison-node';
import { mockStorage } from '../../storage/hashed_item_store/mock';
import { createStateHash, isStateHash } from './state_hash';

describe('stateHash', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  describe('#createStateHash', () => {
    it('returns a hash', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash = createStateHash(json);
      expect(isStateHash(hash)).toBe(true);
    });

    it('returns the same hash for the same input', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash1 = createStateHash(json);
      const hash2 = createStateHash(json);
      expect(hash1).toEqual(hash2);
    });

    it('returns a different hash for different input', () => {
      const json1 = JSON.stringify({ a: 'a' });
      const hash1 = createStateHash(json1);

      const json2 = JSON.stringify({ a: 'b' });
      const hash2 = createStateHash(json2);
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('#isStateHash', () => {
    it('returns true for values created using #createStateHash', () => {
      const json = JSON.stringify({ a: 'a' });
      const hash = createStateHash(json);
      expect(isStateHash(hash)).toBe(true);
    });

    it('returns false for values not created using #createStateHash', () => {
      const json = JSON.stringify({ a: 'a' });
      expect(isStateHash(json)).toBe(false);
    });

    it('returns false for RISON', () => {
      // We're storing RISON in the URL, so let's test against this specifically.
      const rison = encodeRison({ a: 'a' });
      expect(isStateHash(rison)).toBe(false);
    });
  });
});
