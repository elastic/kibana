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
import sinon from 'sinon';

import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { HashedItemStore } from '../hashed_item_store';

describe('hashedItemStore', () => {
  describe('interface', () => {
    describe('#constructor', () => {
      it('retrieves persisted index from sessionStorage', () => {
        const sessionStorage = new StubBrowserStorage();
        sinon.spy(sessionStorage, 'getItem');

        new HashedItemStore(sessionStorage);
        sinon.assert.calledWith(sessionStorage.getItem, HashedItemStore.PERSISTED_INDEX_KEY);
        sessionStorage.getItem.restore();
      });

      it('sorts indexed items by touched property', () => {
        const a = {
          hash: 'a',
          touched: 0,
        };
        const b = {
          hash: 'b',
          touched: 2,
        };
        const c = {
          hash: 'c',
          touched: 1,
        };
        const sessionStorage = new StubBrowserStorage();
        if (!HashedItemStore.PERSISTED_INDEX_KEY) {
          // This is very brittle and depends upon HashedItemStore implementation details,
          // so let's protect ourselves from accidentally breaking this test.
          throw new Error('Missing HashedItemStore.PERSISTED_INDEX_KEY');
        }
        sessionStorage.setItem(HashedItemStore.PERSISTED_INDEX_KEY, JSON.stringify({ a, b, c }));

        const hashedItemStore = new HashedItemStore(sessionStorage);
        expect(hashedItemStore._indexedItems).to.eql([a, c, b]);
      });
    });

    describe('#setItem', () => {
      describe('if the item exists in sessionStorage', () => {
        let sessionStorage;
        let hashedItemStore;
        const hash = 'a';
        const item = JSON.stringify({});

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it('persists the item in sessionStorage', () => {
          hashedItemStore.setItem(hash, item);
          expect(sessionStorage.getItem(hash)).to.equal(item);
        });

        it('returns true', () => {
          const result = hashedItemStore.setItem(hash, item);
          expect(result).to.equal(true);
        });
      });

      describe(`if the item doesn't exist in sessionStorage`, () => {
        describe(`if there's storage space`, () => {
          let sessionStorage;
          let hashedItemStore;
          const hash = 'a';
          const item = JSON.stringify({});

          beforeEach(() => {
            sessionStorage = new StubBrowserStorage();
            hashedItemStore = new HashedItemStore(sessionStorage);
          });

          it('persists the item in sessionStorage', () => {
            hashedItemStore.setItem(hash, item);
            expect(sessionStorage.getItem(hash)).to.equal(item);
          });

          it('returns true', () => {
            const result = hashedItemStore.setItem(hash, item);
            expect(result).to.equal(true);
          });
        });

        describe(`if there isn't storage space`, () => {
          let fakeTimer;
          let sessionStorage;
          let hashedItemStore;
          let storageSizeLimit;
          const hash = 'a';
          const item = JSON.stringify({});

          function setItemLater(hash, item) {
            // Move time forward, so this item will be "touched" most recently.
            fakeTimer.tick(1);
            return hashedItemStore.setItem(hash, item);
          }

          beforeEach(() => {
            // Control time.
            fakeTimer = sinon.useFakeTimers(Date.now());

            sessionStorage = new StubBrowserStorage();
            hashedItemStore = new HashedItemStore(sessionStorage);

            // Add some items that will be removed.
            setItemLater('b', item);

            // Do this a little later so that this item is newer.
            setItemLater('c', item);

            // Cap the storage at its current size.
            storageSizeLimit = sessionStorage.getStubbedSize();
            sessionStorage.setStubbedSizeLimit(storageSizeLimit);
          });

          afterEach(() => {
            // Stop controlling time.
            fakeTimer.restore();
          });

          describe('and the item will fit', () => {
            it('removes older items until the new item fits', () => {
              setItemLater(hash, item);
              expect(sessionStorage.getItem('b')).to.equal(null);
              expect(sessionStorage.getItem('c')).to.equal(item);
            });

            it('persists the item in sessionStorage', () => {
              setItemLater(hash, item);
              expect(sessionStorage.getItem(hash)).to.equal(item);
            });

            it('returns true', () => {
              const result = setItemLater(hash, item);
              expect(result).to.equal(true);
            });
          });

          describe(`and the item won't fit`, () => {
            let itemTooBigToFit;

            beforeEach(() => {
              // Make sure the item is longer than the storage size limit.
              itemTooBigToFit = '';
              const length = storageSizeLimit + 1;
              for (let i = 0; i < length; i++) {
                itemTooBigToFit += 'a';
              }
            });

            it('removes all items', () => {
              setItemLater(hash, itemTooBigToFit);
              expect(sessionStorage.getItem('b')).to.equal(null);
              expect(sessionStorage.getItem('c')).to.equal(null);
            });

            it(`doesn't persist the item in sessionStorage`, () => {
              setItemLater(hash, itemTooBigToFit);
              expect(sessionStorage.getItem(hash)).to.equal(null);
            });

            it('returns false', () => {
              const result = setItemLater(hash, itemTooBigToFit);
              expect(result).to.equal(false);
            });
          });
        });
      });
    });

    describe('#getItem', () => {
      describe('if the item exists in sessionStorage', () => {
        let fakeTimer;
        let sessionStorage;
        let hashedItemStore;

        function setItemLater(hash, item) {
          // Move time forward, so this item will be "touched" most recently.
          fakeTimer.tick(1);
          return hashedItemStore.setItem(hash, item);
        }

        function getItemLater(hash) {
          // Move time forward, so this item will be "touched" most recently.
          fakeTimer.tick(1);
          return hashedItemStore.getItem(hash);
        }

        beforeEach(() => {
          // Control time.
          fakeTimer = sinon.useFakeTimers(Date.now());

          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
          hashedItemStore.setItem('1', 'a');
        });

        afterEach(() => {
          // Stop controlling time.
          fakeTimer.restore();
        });

        it('returns the item', () => {
          const retrievedItem = hashedItemStore.getItem('1');
          expect(retrievedItem).to.be('a');
        });

        it('prevents the item from being first to be removed when freeing up storage space', () => {
          // Do this a little later so that this item is newer.
          setItemLater('2', 'b');

          // Wait a bit, then retrieve/touch the first item, making *it* newer, and 2 as the oldest.
          getItemLater('1');

          // Cap the storage at its current size.
          const storageSizeLimit = sessionStorage.getStubbedSize();
          sessionStorage.setStubbedSizeLimit(storageSizeLimit);

          // Add a new item, causing the second item to be removed, but not the first.
          setItemLater('3', 'c');
          expect(hashedItemStore.getItem('2')).to.equal(null);
          expect(hashedItemStore.getItem('1')).to.equal('a');
        });
      });

      describe(`if the item doesn't exist in sessionStorage`, () => {
        let sessionStorage;
        let hashedItemStore;
        const hash = 'a';

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it('returns null', () => {
          const retrievedItem = hashedItemStore.getItem(hash);
          expect(retrievedItem).to.be(null);
        });
      });
    });
  });

  describe('behavior', () => {
    let fakeTimer;
    let sessionStorage;
    let hashedItemStore;

    function setItemLater(hash, item) {
      // Move time forward, so this item will be "touched" most recently.
      fakeTimer.tick(1);
      return hashedItemStore.setItem(hash, item);
    }

    function getItemLater(hash) {
      // Move time forward, so this item will be "touched" most recently.
      fakeTimer.tick(1);
      return hashedItemStore.getItem(hash);
    }

    beforeEach(() => {
      // Control time.
      fakeTimer = sinon.useFakeTimers(Date.now());

      sessionStorage = new StubBrowserStorage();
      hashedItemStore = new HashedItemStore(sessionStorage);
    });

    afterEach(() => {
      // Stop controlling time.
      fakeTimer.restore();
    });

    it('orders items to be removed based on when they were last retrieved', () => {
      setItemLater('1', 'a');
      setItemLater('2', 'b');
      setItemLater('3', 'c');
      setItemLater('4', 'd');

      // Cap the storage at its current size.
      const storageSizeLimit = sessionStorage.getStubbedSize();
      sessionStorage.setStubbedSizeLimit(storageSizeLimit);

      // Expect items to be removed in order: 1, 3, 2, 4.
      getItemLater('1');
      getItemLater('3');
      getItemLater('2');
      getItemLater('4');

      setItemLater('5', 'e');
      expect(hashedItemStore.getItem('1')).to.equal(null);
      expect(hashedItemStore.getItem('3')).to.equal('c');
      expect(hashedItemStore.getItem('2')).to.equal('b');
      expect(hashedItemStore.getItem('4')).to.equal('d');
      expect(hashedItemStore.getItem('5')).to.equal('e');

      setItemLater('6', 'f');
      expect(hashedItemStore.getItem('3')).to.equal(null);
      expect(hashedItemStore.getItem('2')).to.equal('b');
      expect(hashedItemStore.getItem('4')).to.equal('d');
      expect(hashedItemStore.getItem('5')).to.equal('e');
      expect(hashedItemStore.getItem('6')).to.equal('f');

      setItemLater('7', 'g');
      expect(hashedItemStore.getItem('2')).to.equal(null);
      expect(hashedItemStore.getItem('4')).to.equal('d');
      expect(hashedItemStore.getItem('5')).to.equal('e');
      expect(hashedItemStore.getItem('6')).to.equal('f');
      expect(hashedItemStore.getItem('7')).to.equal('g');

      setItemLater('8', 'h');
      expect(hashedItemStore.getItem('4')).to.equal(null);
      expect(hashedItemStore.getItem('5')).to.equal('e');
      expect(hashedItemStore.getItem('6')).to.equal('f');
      expect(hashedItemStore.getItem('7')).to.equal('g');
      expect(hashedItemStore.getItem('8')).to.equal('h');

      setItemLater('9', 'i');
      expect(hashedItemStore.getItem('5')).to.equal(null);
      expect(hashedItemStore.getItem('6')).to.equal('f');
      expect(hashedItemStore.getItem('7')).to.equal('g');
      expect(hashedItemStore.getItem('8')).to.equal('h');
      expect(hashedItemStore.getItem('9')).to.equal('i');
    });
  });
});
