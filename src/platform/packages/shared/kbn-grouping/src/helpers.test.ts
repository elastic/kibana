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
  isRawBucket,
  isGroupingBucket,
  validateEnforcedGroups,
  ensureEnforcedGroupsInFront,
  LOCAL_STORAGE_GROUPING_KEY,
} from './helpers';
import type { Storage, GroupModel, GroupSettings } from './hooks/types';
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

  describe('isRawBucket', () => {
    it('returns true for a valid RawBucket with string key', () => {
      const bucket: RawBucket<{}> = {
        key: 'test-key',
        doc_count: 5,
      };
      expect(isRawBucket(bucket)).toBe(true);
    });

    it('returns true for a valid RawBucket with array key', () => {
      const bucket: RawBucket<{}> = {
        key: ['key1', 'key2'],
        doc_count: 10,
      };
      expect(isRawBucket(bucket)).toBe(true);
    });

    it('returns true for a RawBucket with optional key_as_string', () => {
      const bucket = {
        key: 'test',
        key_as_string: 'Test Key',
        doc_count: 3,
      };
      expect(isRawBucket(bucket)).toBe(true);
    });

    it('returns true for a RawBucket with additional properties (generic type T)', () => {
      const bucket = {
        key: 'test',
        doc_count: 7,
        customField: 'extra',
        anotherField: 123,
      };
      expect(isRawBucket(bucket)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isRawBucket(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isRawBucket(undefined)).toBe(false);
    });

    it('returns false for a non-object value', () => {
      expect(isRawBucket('string')).toBe(false);
      expect(isRawBucket(123)).toBe(false);
      expect(isRawBucket(true)).toBe(false);
    });

    it('returns false for an object missing key property', () => {
      const bucket = {
        doc_count: 5,
      };
      expect(isRawBucket(bucket)).toBe(false);
    });

    it('returns false for an object missing doc_count property', () => {
      const bucket = {
        key: 'test',
      };
      expect(isRawBucket(bucket)).toBe(false);
    });

    it('returns false for an object with invalid key type', () => {
      const bucket = {
        key: 123,
        doc_count: 5,
      };
      expect(isRawBucket(bucket)).toBe(false);
    });

    it('returns false for an object with invalid doc_count type', () => {
      const bucket = {
        key: 'test',
        doc_count: '5',
      };
      expect(isRawBucket(bucket)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isRawBucket({})).toBe(false);
    });

    it('returns false for an array', () => {
      expect(isRawBucket([])).toBe(false);
      expect(isRawBucket([{ key: 'test', doc_count: 1 }])).toBe(false);
    });
  });

  describe('isGroupingBucket', () => {
    it('returns true for a valid GroupingBucket', () => {
      const bucket: GroupingBucket<{}> = {
        key: ['key1', 'key2'],
        key_as_string: 'Key 1, Key 2',
        doc_count: 15,
        selectedGroup: 'groupName',
      };
      expect(isGroupingBucket(bucket)).toBe(true);
    });

    it('returns true for a GroupingBucket with isNullGroup', () => {
      const bucket: GroupingBucket<{}> = {
        key: ['none'],
        key_as_string: 'None',
        doc_count: 5,
        selectedGroup: 'test',
        isNullGroup: true,
      };
      expect(isGroupingBucket(bucket)).toBe(true);
    });

    it('returns true for a GroupingBucket with additional properties (generic type T)', () => {
      const bucket = {
        key: ['key'],
        key_as_string: 'Key',
        doc_count: 20,
        selectedGroup: 'myGroup',
        customData: { foo: 'bar' },
      };
      expect(isGroupingBucket(bucket)).toBe(true);
    });

    it('returns false for a RawBucket (missing selectedGroup)', () => {
      const bucket: RawBucket<{}> = {
        key: ['key'],
        key_as_string: 'Key',
        doc_count: 10,
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false for a RawBucket with string key instead of array', () => {
      const bucket = {
        key: 'string-key',
        key_as_string: 'String Key',
        doc_count: 5,
        selectedGroup: 'group',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false when key is not an array', () => {
      const bucket = {
        key: 'test',
        key_as_string: 'Test',
        doc_count: 1,
        selectedGroup: 'group',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false when missing key_as_string', () => {
      const bucket = {
        key: ['key'],
        doc_count: 1,
        selectedGroup: 'group',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false when selectedGroup is not a string', () => {
      const bucket = {
        key: ['key'],
        key_as_string: 'Key',
        doc_count: 1,
        selectedGroup: 123,
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false when key_as_string is not a string', () => {
      const bucket = {
        key: ['key'],
        key_as_string: 123,
        doc_count: 1,
        selectedGroup: 'group',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isGroupingBucket(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isGroupingBucket(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isGroupingBucket('string')).toBe(false);
      expect(isGroupingBucket(123)).toBe(false);
      expect(isGroupingBucket(true)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isGroupingBucket({})).toBe(false);
    });

    it('returns false when missing doc_count (fails isRawBucket check)', () => {
      const bucket = {
        key: ['key'],
        key_as_string: 'Key',
        selectedGroup: 'group',
      };
      expect(isGroupingBucket(bucket)).toBe(false);
    });
  });

  describe('validateEnforcedGroups', () => {
    it('does not throw when settings is undefined', () => {
      expect(() => validateEnforcedGroups(undefined, undefined)).not.toThrow();
    });

    it('does not throw when enforcedGroups is not provided', () => {
      const settings: GroupSettings = {};
      expect(() => validateEnforcedGroups(settings, undefined)).not.toThrow();
    });

    it('does not throw when enforcedGroups is empty', () => {
      const settings: GroupSettings = { enforcedGroups: [] };
      expect(() => validateEnforcedGroups(settings, undefined)).not.toThrow();
    });

    it('throws error when "none" is in enforcedGroups', () => {
      const settings: GroupSettings = { enforcedGroups: ['none'] };
      expect(() => validateEnforcedGroups(settings, undefined)).toThrow(
        "'none' cannot be in enforcedGroups"
      );
    });

    it('throws error when "none" is in enforcedGroups with other groups', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1', 'none', 'group2'] };
      expect(() => validateEnforcedGroups(settings, undefined)).toThrow(
        "'none' cannot be in enforcedGroups"
      );
    });

    it('does not throw when enforcedGroups.length <= maxGroupingLevels', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1', 'group2'] };
      expect(() => validateEnforcedGroups(settings, 2)).not.toThrow();
      expect(() => validateEnforcedGroups(settings, 3)).not.toThrow();
    });

    it('throws error when enforcedGroups.length > maxGroupingLevels', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1', 'group2', 'group3'] };
      expect(() => validateEnforcedGroups(settings, 2)).toThrow(
        'enforcedGroups.length (3) must be <= maxGroupingLevels (2)'
      );
    });

    it('does not throw when maxGroupingLevels is undefined', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1', 'group2', 'group3'] };
      expect(() => validateEnforcedGroups(settings, undefined)).not.toThrow();
    });

    it('throws error when enforcedGroups are used with maxGroupingLevels === 1 (toggle mode)', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1'] };
      expect(() => validateEnforcedGroups(settings, 1)).toThrow(
        'enforcedGroups cannot be used when maxGroupingLevels is 1 (toggle mode)'
      );
    });

    it('validates both constraints together', () => {
      const settings: GroupSettings = { enforcedGroups: ['group1', 'group2'] };
      expect(() => validateEnforcedGroups(settings, 2)).not.toThrow();
      expect(() => validateEnforcedGroups(settings, 3)).not.toThrow();
    });
  });

  describe('ensureEnforcedGroupsInFront', () => {
    it('returns groups unchanged when enforced is empty', () => {
      const groups = ['group1', 'group2'];
      expect(ensureEnforcedGroupsInFront(groups, [])).toEqual(groups);
    });

    it('returns enforced groups when only "none" is selected', () => {
      const enforced = ['group1', 'group2'];
      expect(ensureEnforcedGroupsInFront(['none'], enforced)).toEqual(['group1', 'group2']);
    });

    it('places enforced groups in front of non-enforced groups', () => {
      const groups = ['group3', 'group1', 'group4', 'group2'];
      const enforced = ['group1', 'group2'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3', 'group4']);
    });

    it('adds missing enforced groups to the front', () => {
      const groups = ['group3', 'group4'];
      const enforced = ['group1', 'group2'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3', 'group4']);
    });

    it('removes duplicates and places enforced groups in front', () => {
      const groups = ['group1', 'group3', 'group2', 'group4'];
      const enforced = ['group1', 'group2'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3', 'group4']);
    });

    it('handles single enforced group', () => {
      const groups = ['group2', 'group3'];
      const enforced = ['group1'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3']);
    });

    it('handles multiple enforced groups', () => {
      const groups = ['group4', 'group5'];
      const enforced = ['group1', 'group2', 'group3'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3', 'group4', 'group5']);
    });

    it('preserves order of enforced groups', () => {
      const groups = ['group3'];
      const enforced = ['group2', 'group1'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group2', 'group1', 'group3']);
    });

    it('preserves order of non-enforced groups', () => {
      const groups = ['group3', 'group4', 'group5'];
      const enforced = ['group1', 'group2'];
      const result = ensureEnforcedGroupsInFront(groups, enforced);
      expect(result).toEqual(['group1', 'group2', 'group3', 'group4', 'group5']);
    });
  });
});
