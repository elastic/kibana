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
}

export interface UpdateActiveGroups {
  type: ActionType.updateActiveGroups;
  payload: { activeGroups: string[]; id: string };
}

export interface UpdateGroupOptions {
  type: ActionType.updateGroupOptions;
  payload: { newOptionList: GroupOption[]; id: string };
}

export type Action = UpdateActiveGroups | UpdateGroupOptions;

// state

export interface GroupOption {
  key: string;
  label: string;
}

export interface GroupModel {
  activeGroups: string[];
  options: GroupOption[];
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
