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
  UpdateActiveGroups,
  UpdateGroupItemsPerPage,
  UpdateGroupOptions,
} from '../types';

const updateActiveGroups = ({
  activeGroups,
  id,
}: {
  activeGroups: string[];
  id: string;
}): UpdateActiveGroups => ({
  payload: {
    activeGroups,
    id,
  },
  type: ActionType.updateActiveGroups,
});

const updateGroupItemsPerPage = ({
  itemsPerPage,
  id,
  selectedGroup,
}: {
  itemsPerPage: number;
  id: string;
  selectedGroup: string;
}): UpdateGroupItemsPerPage => ({
  payload: {
    itemsPerPage,
    id,
    selectedGroup,
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
  updateActiveGroups,
  updateGroupItemsPerPage,
  updateGroupOptions,
};
