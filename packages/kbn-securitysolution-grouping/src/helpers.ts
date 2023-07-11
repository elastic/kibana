/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EMPTY_GROUP_BY_ID, GroupModel, GroupsById, Storage } from './hooks/types';
import * as i18n from './components/translations';

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
