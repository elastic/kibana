/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { enableMapSet } from 'immer';
import {
  createStoreReducers,
  type IStoreState,
  type GroupNode,
  type LeafNode,
  type TableState,
} from './reducers';

describe('createStoreReducers', () => {
  const initialState: IStoreState<GroupNode, LeafNode> = {
    table: {} as TableState,
    groupNodes: [],
    leafNodes: new Map(),
    groupByColumns: [],
    currentGroupByColumns: [],
  };

  let reducers: ReturnType<typeof createStoreReducers>;

  beforeAll(() => {
    // Set up any necessary state or context for the tests
    enableMapSet();
    reducers = createStoreReducers();
  });

  it('should return the expected correct reducers', () => {
    expect(Object.keys(reducers)).toHaveLength(7);
    expect(reducers).toMatchInlineSnapshot(`
      Object {
        "resetActiveCascadeGroups": [Function],
        "setActiveCascadeGroups": [Function],
        "setExpandedRows": [Function],
        "setInitialState": [Function],
        "setRowGroupLeafData": [Function],
        "setRowGroupNodeData": [Function],
        "setSelectedRows": [Function],
      }
    `);
  });

  describe('setInitialState', () => {
    it('should set the initial state correctly', () => {
      const groupNodes = Array.from<GroupNode>(
        new Array(3).fill(null).map((_, i) => ({ id: `group-${i}` }))
      );

      const newState = reducers.setInitialState(initialState, groupNodes);
      expect(newState.groupNodes).toStrictEqual(groupNodes);
    });
  });

  describe('setExpandedRows', () => {
    it('should set the expanded rows correctly', () => {
      const expandedState = { 'leaf-0': true, 'leaf-1': false };

      const newState = reducers.setExpandedRows(initialState, expandedState);
      expect(newState.table.expanded).toStrictEqual(expandedState);
    });
  });

  describe('setActiveCascadeGroups', () => {
    it('should throw an error if an invalid column is provided', () => {
      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        groupByColumns: ['group-0', 'group-1'],
      };

      const columnGroups = ['group-0', 'invalid-group'];

      expect(() => {
        reducers.setActiveCascadeGroups(currentState, columnGroups);
      }).toThrowErrorMatchingInlineSnapshot(`"Invalid column: invalid-group"`);
    });

    it('should set the active cascade groups correctly', () => {
      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        groupByColumns: ['group-0', 'group-1'],
      };

      const columnGroups = ['group-0', 'group-1'];

      const newState = reducers.setActiveCascadeGroups(currentState, columnGroups);
      expect(newState.currentGroupByColumns).toStrictEqual(columnGroups);
    });

    it('should close out any previously expanded leaf rows on group changes', () => {
      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        groupByColumns: ['group-0', 'group-1'],
        table: {
          expanded: {
            '0': true,
          },
        } as unknown as TableState,
        leafNodes: new Map([['leaf:0', [{ id: 'group-0:leaf:0' }]]]),
      };

      const columnGroups = ['group-0'];

      const newState = reducers.setActiveCascadeGroups(currentState, columnGroups);
      expect(newState.table.expanded).toEqual({});
    });
  });

  describe('resetActiveCascadeGroups', () => {
    it('should reset the active cascade groups correctly', () => {
      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        groupByColumns: ['group-0', 'group-1'],
      };

      const newState = reducers.resetActiveCascadeGroups(currentState);
      expect(newState.currentGroupByColumns).toHaveLength(1);
      expect(newState.currentGroupByColumns).toMatchInlineSnapshot(`
        Array [
          "group-0",
        ]
      `);
    });
  });

  describe('setRowGroupLeafData', () => {
    it('should update the row group leaf data correctly', () => {
      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        leafNodes: new Map([['leaf:0', [{ id: 'group-0:leaf:0' }]]]),
      };

      const newState = reducers.setRowGroupLeafData(currentState, {
        cacheKey: 'leaf:1',
        data: [{ id: '1', updated: true }],
      });

      expect(newState.leafNodes.get('leaf:1')).toEqual([{ id: '1', updated: true }]);
    });
  });

  describe('setRowGroupNodeData', () => {
    it('should update the root row group node data correctly', () => {
      const groupNodes: GroupNode[] = [{ id: 'group-0', field: 'value' }];

      const currentState: IStoreState<GroupNode, LeafNode> = {
        ...initialState,
        groupNodes,
      };

      const subGroupNodes: GroupNode[] = [{ id: 'group-1', field: 'value' }];

      const newState = reducers.setRowGroupNodeData(currentState, {
        id: groupNodes[0].id,
        data: subGroupNodes,
      });

      expect(newState.groupNodes.find((node) => node.id === groupNodes[0].id)).toHaveProperty(
        'children',
        subGroupNodes
      );
    });
  });
});
