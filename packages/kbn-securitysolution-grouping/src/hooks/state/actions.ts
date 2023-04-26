/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ActionType,
  GroupOption,
  UpdateActiveGroup,
  UpdateGroupActivePage,
  UpdateGroupItemsPerPage,
  UpdateGroupOptions,
} from '../types';

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

export const groupActions = {
  updateActiveGroup,
  updateGroupActivePage,
  updateGroupItemsPerPage,
  updateGroupOptions,
};
