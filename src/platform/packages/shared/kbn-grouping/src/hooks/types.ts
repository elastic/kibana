/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// action types
export enum ActionType {
  updateActiveGroups = 'UPDATE_ACTIVE_GROUPS',
  updateGroupOptions = 'UPDATE_GROUP_OPTIONS',
  updateGroupSettings = 'UPDATE_GROUP_SETTINGS',
}

export interface UpdateActiveGroups {
  type: ActionType.updateActiveGroups;
  payload: { activeGroups: string[]; id: string };
}

export interface UpdateGroupOptions {
  type: ActionType.updateGroupOptions;
  payload: { newOptionList: GroupOption[]; id: string };
}

export interface UpdateGroupSettings {
  type: ActionType.updateGroupSettings;
  payload: { settings?: GroupSettings; id: string };
}

export type Action = UpdateActiveGroups | UpdateGroupOptions | UpdateGroupSettings;

// state

export interface GroupOption {
  key: string;
  label: string;
}

export interface GroupSettings {
  /**
   * Allows to hide the None option in the group selection dropdown.
   */
  hideNoneOption?: boolean;
  /**
   * Allows to hide the Custom field option in the group selection dropdown.
   */
  hideCustomFieldOption?: boolean;
  /**
   * Allows to hide the title in the group selection dropdown.
   */
  hideOptionsTitle?: boolean;
  /**
   * Allows to customize the label of the group selection dropdown.
   */
  popoverButtonLabel?: string;
  /**
   * Array of group keys that are enforced and cannot be deselected by users.
   * Enforced groups are automatically added to activeGroups on initialization.
   * Constraints:
   * - 'none' cannot be in enforcedGroups
   * - enforcedGroups cannot be used when maxGroupingLevels === 1 (toggle mode)
   * - enforcedGroups.length must be <= maxGroupingLevels
   */
  enforcedGroups?: string[];
}

export interface GroupModel {
  activeGroups: string[];
  options: GroupOption[];
  /**
   * Allows to customize the group selection dropdown.
   */
  settings?: GroupSettings;
}

export interface GroupsById {
  [id: string]: GroupModel;
}

export interface GroupMap {
  groupById: GroupsById;
}

export interface GroupState {
  groups: GroupMap;
}

export interface Storage<T = any, S = void> {
  getItem: (key: string) => T | null;
  setItem: (key: string, value: T) => S;
  removeItem: (key: string) => T | null;
  clear: () => void;
}
export const EMPTY_GROUP_BY_ID: GroupsById = {};

export const defaultGroup: GroupModel = {
  activeGroups: ['none'],
  options: [],
};
