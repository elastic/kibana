/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type DispatchActionType =
  | 'UPDATE_QUERY'
  | 'SET_GROUP_BY_COLUMN'
  | 'SET_INITIAL_STATE'
  | 'EMPTY_GROUP_BY_COLUMN_SELECTION'
  | 'UPDATE_ROW_DATA';

export type IDispatchAction =
  | {
      type: Extract<DispatchActionType, 'UPDATE_QUERY'>;
      payload: string;
    }
  | {
      type: Extract<DispatchActionType, 'SET_GROUP_BY_COLUMN'>;
      payload: string | null;
    }
  | {
      type: Extract<DispatchActionType, 'SET_INITIAL_STATE'>;
      payload: Array<Record<string, any>>;
    }
  | {
      type: Extract<DispatchActionType, 'EMPTY_GROUP_BY_COLUMN_SELECTION'>;
      payload?: string;
    }
  | {
      type: Extract<DispatchActionType, 'UPDATE_ROW_DATA'>;
      payload: {
        id: string;
        data: Record<string, any>;
      };
    };

/**
 * Represents a document with an ID field.
 * Defines a base expectation to ensure that all documents in the store have a unique identifier.
 */
export type DocWithId = Record<string, any> & { id: string; children?: DocWithId[] };

export interface IStoreState<T extends DocWithId> {
  data: T[];
  currentQueryString: string;
  groupByColumns: string[] | null;
  currentGroupByColumn: string | null;
}

export const storeReducer = <T extends DocWithId = DocWithId>(
  state: IStoreState<T>,
  action: IDispatchAction
) => {
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
    case 'SET_INITIAL_STATE':
      return {
        ...state,
        data: action.payload,
      };
    case 'EMPTY_GROUP_BY_COLUMN_SELECTION':
      return {
        ...state,
        currentGroupByColumn: state.groupByColumns ? state?.groupByColumns[0] : null,
      };
    case 'UPDATE_ROW_DATA': {
      return {
        ...state,
        data: state.data.map((row) => {
          if (row.id === action.payload.id) {
            return { ...row, children: action.payload.data || [] };
          }
          return row;
        }),
      };
    }
    default:
      return state;
  }
};
