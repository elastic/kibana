/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export const groupsReducer = (state: GroupMap, action: Action) => {
  let groupsInStorage = {};
  if (storage) {
    groupsInStorage = getAllGroupsInStorage(storage);
  }

  const groupsById: GroupsById = {
    ...state.groupById,
    ...groupsInStorage,
  };
  const getState = () => {
    switch (action.type) {
      case ActionType.updateActiveGroup: {
        const { id, activeGroup } = action.payload;
        return {
          ...state,
          groupById: {
            ...groupsById,
            [id]: {
              ...groupsById[id],
              activeGroup,
            },
          },
        };
      }
      case ActionType.updateGroupActivePage: {
        const { id, activePage } = action.payload;
        return {
          ...state,
          groupById: {
            ...groupsById,
            [id]: {
              ...groupsById[id],
              activePage,
            },
          },
        };
      }
      case ActionType.updateGroupItemsPerPage: {
        const { id, itemsPerPage } = action.payload;
        return {
          ...state,
          groupById: {
            ...groupsById,
            [id]: {
              ...groupsById[id],
              itemsPerPage,
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
              ...groupsById[id],
              options: newOptionList,
            },
          },
        };
      }
      case ActionType.initGrouping: {
        const { id } = action.payload;
        return {
          ...state,
          groupById: {
            ...groupsById,
            [id]: {
              ...defaultGroup,
              ...groupsById[id],
            },
          },
        };
      }
    }
    throw Error(`Unknown grouping action`);
  };

  const newState = getState();

  if (storage) {
    const groupId: string = action.payload.id;
    addGroupsToStorage(storage, groupId, newState.groupById[groupId]);
  }

  return newState;
};
