/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castDraft, produce } from 'immer';

type DocWithId = Record<string, any> & { id: string };

/**
 * Represents a group node document, with a base expectation that specifies
 * that all documents in the store have a unique identifier.
 */
export type GroupNode<T extends DocWithId = DocWithId> = T & { id: string; children?: GroupNode[] };

export type LeafNode = DocWithId;

type DispatchActionType =
  | 'SET_INITIAL_STATE'
  | 'SET_ACTIVE_CASCADE_GROUPS'
  | 'RESET_ACTIVE_CASCADE_GROUPS'
  | 'UPDATE_ROW_GROUP_NODE_DATA'
  | 'UPDATE_ROW_GROUP_LEAF_DATA';

export type IDispatchAction<G extends GroupNode, L extends Record<string, any>> =
  | {
      type: Extract<DispatchActionType, 'UPDATE_QUERY'>;
      payload: string;
    }
  | {
      type: Extract<DispatchActionType, 'SET_ACTIVE_CASCADE_GROUPS'>;
      payload: string[];
    }
  | {
      type: Extract<DispatchActionType, 'SET_INITIAL_STATE'>;
      payload: G[];
    }
  | {
      type: Extract<DispatchActionType, 'RESET_ACTIVE_CASCADE_GROUPS'>;
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
  readonly groupNodes: G[];
  readonly leafNodes: Map<string, L[]>;
  /**
   * The available columns that can be used to group the data.
   */
  readonly groupByColumns: string[];
  /**
   * The currently selected group by column. in the order in which they are nested
   */
  readonly currentGroupByColumns: string[];
}

export const storeReducer = <G extends GroupNode = GroupNode, L extends LeafNode = LeafNode>(
  state: IStoreState<G, L>,
  action: IDispatchAction<G, L>
) => {
  switch (action.type) {
    case 'SET_INITIAL_STATE': {
      return produce(state, (draft) => {
        draft.groupNodes = [...castDraft(action.payload)];
      });
    }
    case 'SET_ACTIVE_CASCADE_GROUPS': {
      return produce(state, (draft) => {
        draft.currentGroupByColumns = action.payload;
      });
    }
    case 'RESET_ACTIVE_CASCADE_GROUPS': {
      return produce(state, (draft) => {
        draft.currentGroupByColumns = state.groupByColumns.length ? [state.groupByColumns[0]] : [];
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
        draft.leafNodes.set(cacheKey, castDraft(data));
      });
    }
    default:
      return state;
  }
};
