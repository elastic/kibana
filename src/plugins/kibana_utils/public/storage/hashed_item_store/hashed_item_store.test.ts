/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { HashedItemStore } from './hashed_item_store';

describe('hashedItemStore', () => {
  describe('interface', () => {
    describe('#constructor', () => {
      it('retrieves persisted index from sessionStorage', () => {
        const sessionStorage = new StubBrowserStorage();
        const spy = jest.spyOn(sessionStorage, 'getItem');

        const hashedItemStore = new HashedItemStore(sessionStorage);
        (hashedItemStore as any).getIndexedItems(); // trigger retrieving of indexedItems array from HashedItemStore.PERSISTED_INDEX_KEY
        expect(spy).toBeCalledWith(HashedItemStore.PERSISTED_INDEX_KEY);
        spy.mockReset();
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
        expect((hashedItemStore as any).getIndexedItems()).toEqual([a, c, b]);
      });
    });

    describe('#setItem', () => {
      describe('if the item exists in sessionStorage', () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;
        const hash = 'a';
        const item = JSON.stringify({});

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it('persists the item in sessionStorage', () => {
          hashedItemStore.setItem(hash, item);
          expect(sessionStorage.getItem(hash)).toEqual(item);
        });

        it('returns true', () => {
          const result = hashedItemStore.setItem(hash, item);
          expect(result).toEqual(true);
        });
      });

      describe(`if the item doesn't exist in sessionStorage`, () => {
        describe(`if there's storage space`, () => {
          let sessionStorage: Storage;
          let hashedItemStore: HashedItemStore;
          const hash = 'a';
          const item = JSON.stringify({});

          beforeEach(() => {
            sessionStorage = new StubBrowserStorage();
            hashedItemStore = new HashedItemStore(sessionStorage);
          });

          it('persists the item in sessionStorage', () => {
            hashedItemStore.setItem(hash, item);
            expect(sessionStorage.getItem(hash)).toEqual(item);
          });

          it('returns true', () => {
            const result = hashedItemStore.setItem(hash, item);
            expect(result).toEqual(true);
          });
        });

        describe(`if there isn't storage space`, () => {
          let sessionStorage: Storage;
          let hashedItemStore: HashedItemStore;
          let storageSizeLimit: number;
          const hash = 'a';
          const item = JSON.stringify({});

          function setItemLater(_hash: string, _item: string) {
            // Move time forward, so this item will be "touched" most recently.
            jest.advanceTimersByTime(1);
            return hashedItemStore.setItem(_hash, _item);
          }

          beforeEach(() => {
            // Control time.
            jest.useFakeTimers();

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
            jest.useRealTimers();
          });

          describe('and the item will fit', () => {
            it('removes older items until the new item fits', () => {
              setItemLater(hash, item);
              expect(sessionStorage.getItem('b')).toEqual(null);
              expect(sessionStorage.getItem('c')).toEqual(item);
            });

            it('persists the item in sessionStorage', () => {
              setItemLater(hash, item);
              expect(sessionStorage.getItem(hash)).toEqual(item);
            });

            it('returns true', () => {
              const result = setItemLater(hash, item);
              expect(result).toEqual(true);
            });
          });

          describe(`and the item won't fit`, () => {
            let itemTooBigToFit: string;

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
              expect(sessionStorage.getItem('b')).toEqual(null);
              expect(sessionStorage.getItem('c')).toEqual(null);
            });

            it(`doesn't persist the item in sessionStorage`, () => {
              setItemLater(hash, itemTooBigToFit);
              expect(sessionStorage.getItem(hash)).toEqual(null);
            });

            it('returns false', () => {
              const result = setItemLater(hash, itemTooBigToFit);
              expect(result).toEqual(false);
            });
          });
        });
      });
    });

    describe('#getItem', () => {
      describe('if the item exists in sessionStorage', () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;

        function setItemLater(hash: string, item: string) {
          // Move time forward, so this item will be "touched" most recently.
          jest.advanceTimersByTime(1);
          return hashedItemStore.setItem(hash, item);
        }

        function getItemLater(hash: string) {
          // Move time forward, so this item will be "touched" most recently.
          jest.advanceTimersByTime(1);
          return hashedItemStore.getItem(hash);
        }

        beforeEach(() => {
          // Control time.
          jest.useFakeTimers();

          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
          hashedItemStore.setItem('1', 'a');
        });

        afterEach(() => {
          // Stop controlling time.
          jest.useRealTimers();
        });

        it('returns the item', () => {
          const retrievedItem = hashedItemStore.getItem('1');
          expect(retrievedItem).toBe('a');
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
          expect(hashedItemStore.getItem('2')).toEqual(null);
          expect(hashedItemStore.getItem('1')).toEqual('a');
        });
      });

      describe(`if the item doesn't exist in sessionStorage`, () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;
        const hash = 'a';

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it('returns null', () => {
          const retrievedItem = hashedItemStore.getItem(hash);
          expect(retrievedItem).toBe(null);
        });
      });
    });

    describe('#removeItem', () => {
      describe('if the item exists in sessionStorage', () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
          hashedItemStore.setItem('1', 'a');
          hashedItemStore.setItem('2', 'b');
        });

        it('removes and returns an item', () => {
          const removedItem1 = hashedItemStore.removeItem('1');
          expect(removedItem1).toBe('a');
          expect(hashedItemStore.getItem('1')).toBeNull();
          expect(hashedItemStore.getItem('2')).not.toBeNull();
          expect((hashedItemStore as any).getIndexedItems()).toHaveLength(1);

          const removedItem2 = hashedItemStore.removeItem('2');
          expect(removedItem2).toBe('b');
          expect(hashedItemStore.getItem('1')).toBeNull();
          expect(hashedItemStore.getItem('2')).toBeNull();
          expect((hashedItemStore as any).getIndexedItems()).toHaveLength(0);
        });
      });

      describe(`if the item doesn't exist in sessionStorage`, () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;
        const hash = 'a';

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it('returns null', () => {
          const removedItem = hashedItemStore.removeItem(hash);
          expect(removedItem).toBe(null);
        });
      });
    });

    describe('#clear', () => {
      describe('if the items exist in sessionStorage', () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
          hashedItemStore.setItem('1', 'a');
          hashedItemStore.setItem('2', 'b');
        });

        it('removes all items', () => {
          hashedItemStore.clear();

          expect(hashedItemStore.getItem('1')).toBeNull();
          expect(hashedItemStore.getItem('2')).toBeNull();
          expect((hashedItemStore as any).getIndexedItems()).toHaveLength(0);
        });
      });

      describe(`if items don't exist in sessionStorage`, () => {
        let sessionStorage: Storage;
        let hashedItemStore: HashedItemStore;

        beforeEach(() => {
          sessionStorage = new StubBrowserStorage();
          hashedItemStore = new HashedItemStore(sessionStorage);
        });

        it("doesn't throw", () => {
          expect(() => hashedItemStore.clear()).not.toThrowError();
        });
      });
    });
  });

  describe('behavior', () => {
    let sessionStorage: Storage;
    let hashedItemStore: HashedItemStore;

    function setItemLater(hash: string, item: string) {
      // Move time forward, so this item will be "touched" most recently.
      jest.advanceTimersByTime(1);
      return hashedItemStore.setItem(hash, item);
    }

    function getItemLater(hash: string) {
      // Move time forward, so this item will be "touched" most recently.
      jest.advanceTimersByTime(1);
      return hashedItemStore.getItem(hash);
    }

    beforeEach(() => {
      // Control time.
      jest.useFakeTimers();
      sessionStorage = new StubBrowserStorage();
      hashedItemStore = new HashedItemStore(sessionStorage);
    });

    afterEach(() => {
      // Stop controlling time.
      jest.useRealTimers();
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
      expect(hashedItemStore.getItem('1')).toEqual(null);
      expect(hashedItemStore.getItem('3')).toEqual('c');
      expect(hashedItemStore.getItem('2')).toEqual('b');
      expect(hashedItemStore.getItem('4')).toEqual('d');
      expect(hashedItemStore.getItem('5')).toEqual('e');

      setItemLater('6', 'f');
      expect(hashedItemStore.getItem('3')).toEqual(null);
      expect(hashedItemStore.getItem('2')).toEqual('b');
      expect(hashedItemStore.getItem('4')).toEqual('d');
      expect(hashedItemStore.getItem('5')).toEqual('e');
      expect(hashedItemStore.getItem('6')).toEqual('f');

      setItemLater('7', 'g');
      expect(hashedItemStore.getItem('2')).toEqual(null);
      expect(hashedItemStore.getItem('4')).toEqual('d');
      expect(hashedItemStore.getItem('5')).toEqual('e');
      expect(hashedItemStore.getItem('6')).toEqual('f');
      expect(hashedItemStore.getItem('7')).toEqual('g');

      setItemLater('8', 'h');
      expect(hashedItemStore.getItem('4')).toEqual(null);
      expect(hashedItemStore.getItem('5')).toEqual('e');
      expect(hashedItemStore.getItem('6')).toEqual('f');
      expect(hashedItemStore.getItem('7')).toEqual('g');
      expect(hashedItemStore.getItem('8')).toEqual('h');

      setItemLater('9', 'i');
      expect(hashedItemStore.getItem('5')).toEqual(null);
      expect(hashedItemStore.getItem('6')).toEqual('f');
      expect(hashedItemStore.getItem('7')).toEqual('g');
      expect(hashedItemStore.getItem('8')).toEqual('h');
      expect(hashedItemStore.getItem('9')).toEqual('i');
    });
  });
});
