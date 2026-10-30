/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { DataCascadeProvider, useDataCascadeState } from '.';

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

  it('normalizes restored row selection to the v9 selected-id state', () => {
    const { result } = renderHook(() => useDataCascadeState(), {
      wrapper: ({ children }) => (
        <DataCascadeProvider
          data={[]}
          cascadeGroups={[]}
          initialState={{ rowSelection: { selected: true, unselected: false } }}
        >
          {children}
        </DataCascadeProvider>
      ),
    });

    expect(result.current.table.rowSelection).toEqual({ selected: true });
  });
});
