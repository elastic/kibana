/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// action types
export enum ActionType {
  updateActiveGroup = 'UPDATE_ACTIVE_GROUP',
  updateGroupActivePage = 'UPDATE_GROUP_ACTIVE_PAGE',
  updateGroupItemsPerPage = 'UPDATE_GROUP_ITEMS_PER_PAGE',
  updateGroupOptions = 'UPDATE_GROUP_OPTIONS',
}

export interface UpdateActiveGroup {
  type: ActionType.updateActiveGroup;
  payload: { activeGroup: string; id: string };
}

export interface UpdateGroupActivePage {
  type: ActionType.updateGroupActivePage;
  payload: { activePage: number; id: string };
}
export interface UpdateGroupItemsPerPage {
  type: ActionType.updateGroupItemsPerPage;
  payload: { itemsPerPage: number; id: string };
}
export interface UpdateGroupOptions {
  type: ActionType.updateGroupOptions;
  payload: { newOptionList: GroupOption[]; id: string };
}

export type Action =
  | UpdateActiveGroup
  | UpdateGroupActivePage
  | UpdateGroupItemsPerPage
  | UpdateGroupOptions;

// state

export interface GroupOption {
  key: string;
  label: string;
}

export interface GroupModel {
  activeGroup: string;
  options: GroupOption[];
  activePage: number;
  itemsPerPage: number;
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
  activePage: 0,
  itemsPerPage: 25,
  activeGroup: 'none',
  options: [],
};
