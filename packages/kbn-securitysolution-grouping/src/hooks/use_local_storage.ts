/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { GroupModel, GroupsById } from '@kbn/securitysolution-grouping/src/hooks/types';

const LOCAL_STORAGE_GROUPING_KEY = 'groups';
const EMPTY_GROUP = {} as GroupsById;
export const getAllGroupsInStorage = (storage: Storage): GroupsById => {
  const allGroups = storage.get(LOCAL_STORAGE_GROUPING_KEY);
  if (!allGroups) {
    return EMPTY_GROUP;
  }
  return allGroups;
};

export const addGroupsToStorage = (
  storage: Storage,
  groupingId: string,
  group: GroupModel
): GroupsById => {
  const groups = getAllGroupsInStorage(storage);
  storage.set(LOCAL_STORAGE_GROUPING_KEY, {
    ...groups,
    [groupingId]: group,
  });
};
