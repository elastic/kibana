/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castDraft, produce } from 'immer';
import type { TableState, ExpandedState, RowSelectionState } from '@tanstack/react-table';
import { getLeafIdFromCacheKey } from '../lib/utils';

export type { TableState };

/**
 * Represents a document, with a base expectation that specifies
 * that it has a unique identifier.
 */
type DocWithId = Record<string, any> & { id: string };

/**
 * Represents a group node, with a base expectation that it is a document with a unique identifier, with specific properties.
 * It can also have children, which are other group nodes.
 */
export type GroupNode = DocWithId & {
  children?: GroupNode[];
};

export type LeafNode = DocWithId;

export type ColumnGroups = Array<keyof Omit<GroupNode, 'children' | 'id'>>;

export interface IStoreState<G extends GroupNode, L extends LeafNode> {
  readonly table: TableState;
  /**
   * Record of group nodes that can be displayed in the table.
   */
  readonly groupNodes: G[];
  /**
   * Record of leaf nodes that can be displayed in the table.
   */
  readonly leafNodes: Map<string, L[]>;
  /**
   * The available columns that can be used to group the data.
   */
  readonly groupByColumns: ColumnGroups;
  /**
   * The currently selected group by column. in the order in which they are nested
   */
  readonly currentGroupByColumns: ColumnGroups;
}

export function createStoreReducers<G extends GroupNode, L extends LeafNode>() {
  return {
    setInitialState(state: IStoreState<G, L>, payload: G[]) {
      return produce(state, (draft) => {
        draft.groupNodes = [...castDraft(payload)];
      });
    },
    setActiveCascadeGroups(state: IStoreState<G, L>, payload: ColumnGroups) {
      return produce(state, (draft) => {
        // verify the payload columns exist in the available groupByColumns
        for (const column of payload) {
          if (!draft.groupByColumns.includes(column)) {
            throw new Error(`Invalid column: ${column}`);
          }
        }

        draft.currentGroupByColumns = castDraft(payload);
        // close out any previously expanded leaf row on group changes
        // since the previous render would be invalid with the new group change
        for (const cacheKey of draft.leafNodes.keys()) {
          const leafId = getLeafIdFromCacheKey(cacheKey);

          if (
            draft.table.expanded &&
            typeof draft.table.expanded !== 'boolean' &&
            draft.table.expanded[leafId]
          ) {
            delete draft.table.expanded[leafId];
          }
        }
      });
    },
    resetActiveCascadeGroups(state: IStoreState<G, L>) {
      return produce(state, (draft) => {
        draft.currentGroupByColumns = draft.groupByColumns.length ? [draft.groupByColumns[0]] : [];
        draft.groupNodes.forEach((node) => {
          delete node.children;
        });
      });
    },
    setRowGroupNodeData(state: IStoreState<G, L>, payload: { id: string; data: G[] }) {
      return produce(state, (draft) => {
        const stack: GroupNode[] = Array.isArray(draft.groupNodes)
          ? [...draft.groupNodes]
          : [draft.groupNodes];
        while (stack.length > 0) {
          const node = stack.pop()!;
          if (node.id === payload.id) {
            node.children = Array.isArray(payload.data) ? payload.data : [];
            break; // Early exit after update
          }
          if (node.children && node.children.length > 0) {
            stack.push(...node.children);
          }
        }
      });
    },
    setRowGroupLeafData(state: IStoreState<G, L>, payload: { cacheKey: string; data: L[] }) {
      return produce(state, (draft) => {
        const { cacheKey, data } = payload;
        draft.leafNodes.set(cacheKey, castDraft(data));
      });
    },
    setExpandedRows(state: IStoreState<G, L>, expandedState: ExpandedState) {
      return produce(state, (draft) => {
        draft.table.expanded = expandedState;
      });
    },
    setSelectedRows(state: IStoreState<G, L>, selectedState: RowSelectionState) {
      return produce(state, (draft) => {
        draft.table.rowSelection = selectedState;
      });
    },
  } as const;
}
