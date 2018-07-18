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
import { getMonthInterval, HashTable } from '../utils';

describe('Utils - calendar vis', () => {

  it('should have `getMonthInterval` return a correct month interval', () => {
    const start = new Date('1995-10-17T03:24:00');
    const end = new Date('1995-12-17T03:24:00');
    const [sMonth, eMonth] = getMonthInterval(start, end);
    expect(sMonth).to.equal(10);
    expect(eMonth).to.equal(12);
  });

  describe('HashTable', () => {

    let hashTable;

    beforeEach(() => {
      hashTable = new HashTable();
    });

    afterEach(() => {
      hashTable = null;
    });

    it('should put and get the same entry', () => {
      hashTable.put('foo', 'bar');
      const entry = hashTable.get('foo');
      expect(entry).to.equal('bar');
    });

    it('should throw en error putting the same entry into the HashTable', () => {
      try{
        hashTable.put('foo', 'bar');
        hashTable.put('foo', 'baz');
      }catch(err) {
        expect(err.message).to.equal('invalid key: foo, the entry already exists');
      }
    });

    it('should clear all keys', () => {
      hashTable.put('foo', 'bar');
      hashTable.put('boo', 'faz');
      hashTable.clearAll();
      expect(hashTable.get('foo')).to.equal(null);
      expect(hashTable.get('boo')).to.equal(null);
    });
  });

});
