/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Action,
  ActionType,
  defaultGroup,
  EMPTY_GROUP_BY_ID,
  GroupMap,
  GroupsById,
  Storage,
} from '../types';
import { addGroupsToStorage, getAllGroupsInStorage } from '../..';

const storage: Storage = window.localStorage;

export const initialState: GroupMap = {
  groupById: EMPTY_GROUP_BY_ID,
};

const groupsReducer = (state: GroupMap, action: Action, groupsById: GroupsById) => {
  switch (action.type) {
    case ActionType.updateActiveGroups: {
      const { id, activeGroups } = action.payload;
      return {
        ...state,
        groupById: {
          ...groupsById,
          [id]: {
            ...defaultGroup,
            ...groupsById[id],
            activeGroups,
          },
        },
      };
    }
    case ActionType.updateGroupOptions: {
      const { id, newOptionList } = action.payload;
      return {
        ...state,
        groupById: {
          ...groupsById,
          [id]: {
            ...defaultGroup,
            ...groupsById[id],
            options: newOptionList,
          },
        },
      };
    }
  }
  throw Error(`Unknown grouping action`);
};
export const groupsReducerWithStorage = (state: GroupMap, action: Action) => {
  let groupsInStorage: GroupsById = {};
  if (storage) {
    groupsInStorage = getAllGroupsInStorage(storage);
  }

  const groupsById: GroupsById = {
    ...state.groupById,
    ...groupsInStorage,
  };

  const newState = groupsReducer(state, action, groupsById);

  if (storage) {
    const groupId: string = action.payload.id;
    addGroupsToStorage(storage, groupId, newState.groupById[groupId]);
  }

  return newState;
};
