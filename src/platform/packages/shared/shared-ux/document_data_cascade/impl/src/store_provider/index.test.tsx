/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import {
  DataCascadeProvider,
  useDataCascadeActions,
  useDataCascadeState,
  type GroupNode,
  type LeafNode,
} from '.';

const useStore = () => ({
  state: useDataCascadeState<GroupNode, LeafNode>(),
  actions: useDataCascadeActions<GroupNode, LeafNode>(),
});

describe('DataCascadeProvider', () => {
  it('should render children', () => {
    render(
      <DataCascadeProvider
        data={[]}
        cascadeGroups={['group1', 'group2']}
        initialGroupColumn={['group1']}
      >
        <div>Test Child</div>
      </DataCascadeProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('preserves loaded children and expansion when the input data has not changed', () => {
    const data = [{ id: 'parent' }];
    const { result, rerender } = renderHook(useStore, {
      wrapper: ({ children }) => (
        <DataCascadeProvider data={data} cascadeGroups={['group1', 'group2']}>
          {children}
        </DataCascadeProvider>
      ),
    });

    act(() => result.current.actions.setExpandedRows({ parent: true }));
    act(() =>
      result.current.actions.setRowGroupNodeData({ id: 'parent', data: [{ id: 'child' }] })
    );
    act(() => result.current.actions.setExpandedRows({ parent: true, child: true }));
    act(() =>
      result.current.actions.setRowGroupNodeData({ id: 'child', data: [{ id: 'grandchild' }] })
    );
    rerender();

    expect(result.current.state.groupNodes).toEqual([
      { id: 'parent', children: [{ id: 'child', children: [{ id: 'grandchild' }] }] },
    ]);
    expect(result.current.state.table.expanded).toEqual({ parent: true, child: true });
  });

  it.each(['data', 'columns'] as const)('resets the store when the input %s changes', (input) => {
    let data: GroupNode[] = [{ id: 'parent' }];
    let cascadeGroups = ['group1', 'group2'];
    const { result, rerender } = renderHook(useStore, {
      wrapper: ({ children }) => (
        <DataCascadeProvider data={data} cascadeGroups={cascadeGroups}>
          {children}
        </DataCascadeProvider>
      ),
    });

    act(() => result.current.actions.setExpandedRows({ parent: true }));
    act(() => result.current.actions.setSelectedRows({ parent: true }));
    act(() =>
      result.current.actions.setRowGroupNodeData({ id: 'parent', data: [{ id: 'child' }] })
    );
    act(() =>
      result.current.actions.setRowGroupLeafData({ cacheKey: 'child', data: [{ id: 'leaf' }] })
    );

    if (input === 'data') {
      data = [{ id: 'replacement' }];
    } else {
      cascadeGroups = ['group3'];
    }
    rerender();

    expect(result.current.state.groupNodes).toEqual(data);
    expect(result.current.state.groupByColumns).toEqual(cascadeGroups);
    expect(result.current.state.currentGroupByColumns).toEqual([cascadeGroups[0]]);
    expect(result.current.state.table).toEqual({});
    expect(result.current.state.leafNodes.size).toBe(0);
  });
});
