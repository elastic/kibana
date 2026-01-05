/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GroupModel, GroupsById, Storage, GroupSettings } from './hooks/types';
import { EMPTY_GROUP_BY_ID } from './hooks/types';
import * as i18n from './components/translations';
import type { GroupingBucket, RawBucket } from './components';
import { isNoneGroup } from './components';

/**
 * All mappings in Elasticsearch support arrays. They can also return null values or be missing. For example, a `keyword` mapping could return `null` or `[null]` or `[]` or `'hi'`, or `['hi', 'there']`. We need to handle these cases in order to avoid throwing an error.
 * When dealing with an value that comes from ES, wrap the underlying type in `ECSField`. For example, if you have a `keyword` or `text` value coming from ES, cast it to `ECSField<string>`.
 */
export type ECSField<T> = T | null | undefined | Array<T | null>;
/**
 * Return first non-null value. If the field contains an array, this will return the first value that isn't null. If the field isn't an array it'll be returned unless it's null.
 */
export function firstNonNullValue<T>(valueOrCollection: ECSField<T>): T | undefined {
  if (valueOrCollection === null) {
    return undefined;
  } else if (Array.isArray(valueOrCollection)) {
    for (const value of valueOrCollection) {
      if (value !== null) {
        return value;
      }
    }
  } else {
    return valueOrCollection;
  }
}

export const defaultUnit = (n: number) => i18n.DEFAULT_UNIT(n);

export const LOCAL_STORAGE_GROUPING_KEY = 'groups';
export const getAllGroupsInStorage = (storage: Storage): GroupsById => {
  const allGroups = storage.getItem(LOCAL_STORAGE_GROUPING_KEY);
  if (!allGroups) {
    return EMPTY_GROUP_BY_ID;
  }
  return JSON.parse(allGroups);
};

export const addGroupsToStorage = (storage: Storage, groupingId: string, group: GroupModel) => {
  const groups = getAllGroupsInStorage(storage);
  storage.setItem(
    LOCAL_STORAGE_GROUPING_KEY,
    JSON.stringify({
      ...groups,
      [groupingId]: group,
    })
  );
};

/**
 * A type guard function that checks if a given value is a `RawBucket`.
 * It verifies that the value is an object with the required properties:
 * `key` and `doc_count`.
 *
 * @param bucket The value to check.
 * @returns `true` if the value is a `RawBucket`, `false` otherwise.
 */
export const isRawBucket = <T>(bucket: unknown): bucket is RawBucket<T> => {
  return (
    typeof bucket === 'object' &&
    bucket !== null &&
    'key' in bucket &&
    (typeof bucket.key === 'string' || Array.isArray(bucket.key)) &&
    'doc_count' in bucket &&
    typeof bucket.doc_count === 'number'
  );
};

/**
 * A type guard function that checks if a given bucket is a `GroupingBucket`.
 * It differentiates from a `RawBucket` by verifying the presence of the
 * `selectedGroup` property, which is unique to `GroupingBucket`.
 * Since `GroupingBucket` is derived from `RawBucket`, it first checks if
 * the bucket is a valid `RawBucket` before checking for `GroupingBucket`-specific properties.
 *
 * @param bucket The bucket to check.
 * @returns `true` if the bucket is a `GroupingBucket`, `false` otherwise.
 */
export const isGroupingBucket = <T>(bucket: unknown): bucket is GroupingBucket<T> => {
  return (
    isRawBucket<T>(bucket) &&
    Array.isArray(bucket.key) &&
    'selectedGroup' in bucket &&
    typeof bucket.selectedGroup === 'string' &&
    'key_as_string' in bucket &&
    typeof bucket.key_as_string === 'string'
  );
};

/**
 * Validates enforced groups configuration.
 * Throws an error if validation fails.
 * @param settings - GroupSettings that may contain enforcedGroups
 * @param maxGroupingLevels - Maximum allowed grouping levels
 * @throws Error if 'none' is in enforcedGroups, enforcedGroups are used with maxGroupingLevels === 1, or enforcedGroups.length > maxGroupingLevels
 */
export const validateEnforcedGroups = (
  settings: GroupSettings | undefined,
  maxGroupingLevels: number | undefined
): void => {
  if (!settings?.enforcedGroups) {
    return;
  }

  const { enforcedGroups } = settings;

  // Check that 'none' is not in enforcedGroups
  if (isNoneGroup(enforcedGroups)) {
    throw new Error("'none' cannot be in enforcedGroups");
  }

  // Check that enforced groups cannot be used with toggle mode (maxGroupingLevels === 1)
  if (maxGroupingLevels === 1 && enforcedGroups.length > 0) {
    throw new Error('enforcedGroups cannot be used when maxGroupingLevels is 1 (toggle mode)');
  }

  // Check that enforcedGroups.length <= maxGroupingLevels
  if (maxGroupingLevels !== undefined && enforcedGroups.length > maxGroupingLevels) {
    throw new Error(
      `enforcedGroups.length (${enforcedGroups.length}) must be <= maxGroupingLevels (${maxGroupingLevels})`
    );
  }
};

/**
 * Ensures enforced groups are always included and placed in front of the selected groups array.
 * If only 'none' is selected, returns the enforced groups.
 * @param groups - Currently selected groups
 * @param enforced - Array of enforced group keys
 * @returns New array with enforced groups in front
 */
export const ensureEnforcedGroupsInFront = (groups: string[], enforced: string[]): string[] => {
  if (enforced.length === 0) {
    return groups;
  }
  // If only 'none' is selected, return enforced groups
  if (isNoneGroup(groups)) {
    return [...enforced];
  }
  // Filter out enforced groups, then place enforced groups in front
  const nonEnforcedGroups = groups.filter((g) => !enforced.includes(g));
  return [...enforced, ...nonEnforcedGroups];
};
