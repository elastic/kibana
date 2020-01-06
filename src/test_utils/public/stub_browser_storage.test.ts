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

import { StubBrowserStorage } from './stub_browser_storage';

describe('StubBrowserStorage', () => {
  describe('#getItem() / #setItem()', () => {
    it('stores items as strings', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      expect(store.getItem('1')).toBe('1');
    });

    it('stores keys as strings', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      expect(store.key(0)).toBe('1');
    });

    it('returns null for missing keys', () => {
      const store = new StubBrowserStorage();
      expect(store.getItem('unknown key')).toBe(null);
    });
  });

  describe('#clear()', () => {
    it('clears items', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      store.setItem('2', '2');
      store.clear();
      expect(store.getItem('1')).toBe(null);
      expect(store.getItem('2')).toBe(null);
      expect(store.length).toBe(0);
    });
  });

  describe('#length', () => {
    it('reports the number of items stored', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      store.setItem('2', '2');
      store.setItem('3', '3');
      store.setItem('4', '4');
      expect(store).toHaveLength(4);
    });

    it('does not trip on items getting reset', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      store.setItem('1', '2');
      expect(store).toHaveLength(1);
    });
  });

  describe('#key()', () => {
    it('returns the key as a specific index', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '2');
      expect(store.key(0)).toBe('1');
      expect(store.key(1)).toBeUndefined();
    });
  });

  describe('#setStubbedSizeLimit', () => {
    it('allows limiting the storage size', () => {
      const store = new StubBrowserStorage();
      store.setStubbedSizeLimit(10);
      store.setItem('abc', 'def'); // store size is 6, key.length + val.length
      expect(() => {
        store.setItem('ghi', 'jkl');
      }).toThrowErrorMatchingInlineSnapshot(
        `"something about quota exceeded, browsers are not consistent here"`
      );
    });

    it('allows defining the limit as infinity', () => {
      const store = new StubBrowserStorage();
      store.setStubbedSizeLimit(Infinity);
      store.setItem('abc', 'def');
      store.setItem('ghi', 'jkl'); // unlike the previous test, this doesn't throw
    });

    it('throws an error if the limit is below the current size', () => {
      const store = new StubBrowserStorage();
      store.setItem('key', 'val');
      expect(() => {
        store.setStubbedSizeLimit(5);
      }).toThrowError(Error);
    });

    it('respects removed items', () => {
      const store = new StubBrowserStorage();
      store.setStubbedSizeLimit(10);
      store.setItem('abc', 'def');
      store.removeItem('abc');
      store.setItem('ghi', 'jkl'); // unlike the previous test, this doesn't throw
    });
  });

  describe('#getStubbedSizeLimit', () => {
    it('returns the size limit', () => {
      const store = new StubBrowserStorage();
      store.setStubbedSizeLimit(10);
      expect(store.getStubbedSizeLimit()).toBe(10);
    });
  });

  describe('#getStubbedSize', () => {
    it('returns the size', () => {
      const store = new StubBrowserStorage();
      store.setItem('1', '1');
      expect(store.getStubbedSize()).toBe(2);
    });
  });
});
