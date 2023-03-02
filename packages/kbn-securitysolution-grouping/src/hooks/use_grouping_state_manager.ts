/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useReducer } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { addGroupsToStorage, getAllGroupsInStorage } from './use_local_storage';
import type {
  Action,
  UpdateActiveGroup,
  UpdateGroupActivePage,
  UpdateGroupItemsPerPage,
  UpdateGroupOptions,
  InitGrouping,
  GroupMap,
  GroupOption,
  GroupsById,
  GroupState,
} from './types';
import { ActionType, defaultGroup, EMPTY_GROUP_BY_ID } from './types';

const storage = new Storage(window.localStorage);
// TODO: actions.ts
const updateActiveGroup = ({
  activeGroup,
  id,
}: {
  activeGroup: string;
  id: string;
}): UpdateActiveGroup => ({
  payload: {
    activeGroup,
    id,
  },
  type: ActionType.updateActiveGroup,
});

const updateGroupActivePage = ({
  activePage,
  id,
}: {
  activePage: number;
  id: string;
}): UpdateGroupActivePage => ({
  payload: {
    activePage,
    id,
  },
  type: ActionType.updateGroupActivePage,
});

const updateGroupItemsPerPage = ({
  itemsPerPage,
  id,
}: {
  itemsPerPage: number;
  id: string;
}): UpdateGroupItemsPerPage => ({
  payload: {
    itemsPerPage,
    id,
  },
  type: ActionType.updateGroupItemsPerPage,
});

const updateGroupOptions = ({
  newOptionList,
  id,
}: {
  newOptionList: GroupOption[];
  id: string;
}): UpdateGroupOptions => ({
  payload: {
    newOptionList,
    id,
  },
  type: ActionType.updateGroupOptions,
});

const initGrouping = ({ id }: { id: string }): InitGrouping => ({
  payload: {
    id,
  },
  type: ActionType.initGrouping,
});

export const groupActions = {
  updateActiveGroup,
  updateGroupActivePage,
  updateGroupItemsPerPage,
  updateGroupOptions,
  initGrouping,
};

// TODO: selectors.ts
const selectGroupById = (state: GroupState): GroupsById => state.groups.groupById;

export const groupByIdSelector = (state: GroupState, id: string) => selectGroupById(state)[id];

export const groupsReducer = (state: GroupMap, action: Action) => {
  let groupsInStorage = {};
  if (storage) {
    const groupId: string = action.payload.id;
    console.log('groupId', groupId);
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
        console.log('updateActiveGroup', id);
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
        console.log('updateGroupActivePage', id);
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
        console.log('updateGroupItemsPerPage', id);
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
        console.log('updateGroupOptions', id);
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
        console.log('initGrouping', id);
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
    console.log('groupId', groupId);
    addGroupsToStorage(storage, groupId, newState.groupById[groupId]);
  }
  console.log({ newState });

  return newState;
};
const initialState: GroupMap = {
  groupById: EMPTY_GROUP_BY_ID,
};
export const useGroupingStateManager = () => {
  const [state, dispatch] = useReducer(groupsReducer, initialState);

  return { state, dispatch };
};
