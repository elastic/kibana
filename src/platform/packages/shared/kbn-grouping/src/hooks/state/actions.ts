/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GroupOption,
  UpdateActiveGroups,
  UpdateGroupOptions,
  GroupSettings,
  UpdateGroupSettings,
} from '../types';
import { ActionType } from '../types';

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

const updateGroupSettings = ({
  settings,
  id,
}: {
  settings?: GroupSettings;
  id: string;
}): UpdateGroupSettings => ({
  payload: { settings, id },
  type: ActionType.updateGroupSettings,
});

export const groupActions = {
  updateActiveGroups,
  updateGroupOptions,
  updateGroupSettings,
};
