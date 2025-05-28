/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface IDispatchAction {
  type: string;
  payload: any;
}

export interface IStoreState {
  data: Array<Record<string, any>>;
  currentQueryString: string;
  groupByColumns: string[] | null;
  currentGroupByColumn: string | null;
}

export const storeReducer = (state: IStoreState, action: IDispatchAction) => {
  switch (action.type) {
    case 'UPDATE_QUERY':
      return {
        ...state,
        query: action.payload,
      };
    case 'SET_GROUP_BY_COLUMN':
      return {
        ...state,
        currentGroupByColumn: action.payload,
      };
    case 'EMPTY_GROUP_BY_COLUMN_SELECTION':
      return {
        ...state,
        currentGroupByColumn: state.groupByColumns ? state?.groupByColumns[0] : null,
      };
    default:
      return state;
  }
};
