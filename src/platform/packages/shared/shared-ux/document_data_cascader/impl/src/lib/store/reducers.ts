/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { produce } from 'immer';

/**
 * Represents a group node document, with a base expectation that specifies
 * that all documents in the store have a unique identifier.
 */
export type GroupNode = Record<string, any> & { id: string; children?: GroupNode[] };

export type LeafNode = Record<string, any> & { id: string };

type DispatchActionType =
  | 'UPDATE_QUERY'
  | 'SET_GROUP_BY_COLUMN'
  | 'SET_INITIAL_STATE'
  | 'RESET_GROUP_BY_COLUMN_SELECTION'
  | 'UPDATE_ROW_GROUP_NODE_DATA'
  | 'UPDATE_ROW_GROUP_LEAF_DATA';

export type IDispatchAction<G extends GroupNode, L extends Record<string, any>> =
  | {
      type: Extract<DispatchActionType, 'UPDATE_QUERY'>;
      payload: string;
    }
  | {
      type: Extract<DispatchActionType, 'SET_GROUP_BY_COLUMN'>;
      payload: string[];
    }
  | {
      type: Extract<DispatchActionType, 'SET_INITIAL_STATE'>;
      payload: G[];
    }
  | {
      type: Extract<DispatchActionType, 'RESET_GROUP_BY_COLUMN_SELECTION'>;
    }
  | {
      type: Extract<DispatchActionType, 'UPDATE_ROW_GROUP_NODE_DATA'>;
      payload: {
        id: string;
        data: G[];
      };
    }
  | {
      type: Extract<DispatchActionType, 'UPDATE_ROW_GROUP_LEAF_DATA'>;
      payload: {
        cacheKey: string;
        data: L[];
      };
    };

export interface IStoreState<G extends GroupNode, L extends LeafNode> {
  groupNodes: G[];
  leafNodes: Map<string, L[]>;
  currentQueryString: string;
  /**
   * The available columns that can be used to group the data.
   */
  groupByColumns: string[];
  /**
   * The currently selected group by column. in the order in which they are nested
   */
  currentGroupByColumns: string[];
}

export const storeReducer = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(
  state: IStoreState<G, L>,
  action: IDispatchAction<G, L>
) => {
  switch (action.type) {
    case 'UPDATE_QUERY': {
      return produce(state, (draft) => {
        draft.currentQueryString = action.payload;
        return draft;
      });
    }
    case 'SET_INITIAL_STATE': {
      return produce(state, (draft) => {
        draft.groupNodes = [...action.payload];
        return draft;
      });
    }
    case 'SET_GROUP_BY_COLUMN': {
      return produce(state, (draft) => {
        draft.currentGroupByColumns = action.payload;
        return draft;
      });
    }
    case 'RESET_GROUP_BY_COLUMN_SELECTION': {
      return produce(state, (draft) => {
        draft.currentGroupByColumns = state.groupByColumns.length ? [state.groupByColumns[0]] : [];
        return draft;
      });
    }
    case 'UPDATE_ROW_GROUP_NODE_DATA': {
      return produce(state, (draft) => {
        const stack: GroupNode[] = Array.isArray(draft.groupNodes)
          ? [...draft.groupNodes]
          : [draft.groupNodes];
        while (stack.length > 0) {
          const node = stack.pop()!;
          if (node.id === action.payload.id) {
            node.children = Array.isArray(action.payload.data) ? action.payload.data : [];
            break; // Early exit after update
          }
          if (node.children && node.children.length > 0) {
            stack.push(...node.children);
          }
        }
      });
    }
    case 'UPDATE_ROW_GROUP_LEAF_DATA': {
      return produce(state, (draft) => {
        const { cacheKey, data } = action.payload;
        draft.leafNodes.set(cacheKey, data);
        return draft;
      });
    }
    default:
      return state;
  }
};
