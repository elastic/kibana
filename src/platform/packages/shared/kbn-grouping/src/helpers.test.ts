/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  firstNonNullValue,
  getAllGroupsInStorage,
  addGroupsToStorage,
  isGroupingBucket,
  LOCAL_STORAGE_GROUPING_KEY,
} from './helpers';
import type { Storage, GroupModel } from './hooks/types';
import type { RawBucket, GroupingBucket } from './components';

describe('helpers', () => {
  describe('firstNonNullValue', () => {
    it('returns undefined for null or undefined input', () => {
      expect(firstNonNullValue(null)).toBeUndefined();
      expect(firstNonNullValue(undefined)).toBeUndefined();
    });

    it('returns the value for a single non-array value', () => {
      expect(firstNonNullValue('test')).toBe('test');
      expect(firstNonNullValue(123)).toBe(123);
      expect(firstNonNullValue(0)).toBe(0);
    });

    it('returns the first non-null value from an array', () => {
      expect(firstNonNullValue(['one', 'two'])).toBe('one');
      expect(firstNonNullValue([null, 'two'])).toBe('two');
    });

    it('returns undefined for an array with only null values or an empty array', () => {
      expect(firstNonNullValue([null, null])).toBeUndefined();
      expect(firstNonNullValue([])).toBeUndefined();
    });
  });

  describe('Storage functions', () => {
    let mockStorage: Storage;

    beforeEach(() => {
      const store: { [key: string]: string } = {};
      mockStorage = {
        getItem: (key) => store[key] ?? null,
        setItem: (key, value) => {
          store[key] = value;
        },
        removeItem: (key) => {
          delete store[key];
        },
        clear: () => {
          for (const key in store) {
            if (Object.prototype.hasOwnProperty.call(store, key)) {
              delete store[key];
            }
          }
        },
      };
    });

    it('getAllGroupsInStorage returns empty object when storage is empty', () => {
      expect(getAllGroupsInStorage(mockStorage)).toEqual({});
    });

    it('addGroupsToStorage adds a group to storage', () => {
      const group: GroupModel = { activeGroups: ['group1'], options: [] };
      addGroupsToStorage(mockStorage, 'testId', group);
      const stored = mockStorage.getItem(LOCAL_STORAGE_GROUPING_KEY);
      expect(stored).not.toBeNull();
      if (stored) {
        expect(JSON.parse(stored)).toEqual({ testId: group });
      }
    });

    it('getAllGroupsInStorage retrieves groups from storage', () => {
      const group: GroupModel = { activeGroups: ['group1'], options: [] };
      mockStorage.setItem(LOCAL_STORAGE_GROUPING_KEY, JSON.stringify({ testId: group }));
      expect(getAllGroupsInStorage(mockStorage)).toEqual({ testId: group });
    });

    it('addGroupsToStorage merges with existing groups', () => {
      const existingGroup: GroupModel = { activeGroups: ['group1'], options: [] };
      mockStorage.setItem(
        LOCAL_STORAGE_GROUPING_KEY,
        JSON.stringify({ existingId: existingGroup })
      );
      const newGroup: GroupModel = { activeGroups: ['group2'], options: [] };
      addGroupsToStorage(mockStorage, 'newId', newGroup);
      expect(getAllGroupsInStorage(mockStorage)).toEqual({
        existingId: existingGroup,
        newId: newGroup,
      });
    });
  });

  describe('isGroupingBucket', () => {
    it('returns true for a GroupingBucket', () => {
      const bucket: GroupingBucket<{}> = {
        selectedGroup: 'test',
        doc_count: 1,
        key: ['key'],
        key_as_string: 'key',
      };
      expect(isGroupingBucket(bucket)).toBe(true);
    });

    it('returns false for a RawBucket', () => {
      const bucket: RawBucket<{}> = {
        doc_count: 1,
        key: 'key',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });
  });
});
