/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import { CascadeRowCellPrimitive } from './cascade_row_cell';
import { DataCascadeProvider } from '../../../store_provider';

const renderComponent = ({
  cascadeGroups,
  children,
  initialGroupColumn,
  row,
  onCascadeLeafNodeExpanded = jest.fn(),
}: Pick<
  React.ComponentProps<typeof CascadeRowCellPrimitive>,
  'onCascadeLeafNodeExpanded' | 'row' | 'children'
> &
  Pick<
    React.ComponentProps<typeof DataCascadeProvider>,
    'cascadeGroups' | 'initialGroupColumn'
  >) => {
  return render(
    <DataCascadeProvider cascadeGroups={cascadeGroups} initialGroupColumn={initialGroupColumn}>
      {/* @ts-expect-error -- we don't need to provide all the props */}
      <CascadeRowCellPrimitive
        size="m"
        onCascadeLeafNodeExpanded={onCascadeLeafNodeExpanded}
        row={row}
      >
        {children}
      </CascadeRowCellPrimitive>
    </DataCascadeProvider>
  );
};

describe('CascadeRowCellPrimitive', () => {
  it('will invoke the passed onCascadeLeafNodeExpanded if the leafNode has no data', () => {
    const cascadeGroups = ['group1', 'group2'];

    const onCascadeLeafNodeExpanded = jest.fn();

    const rowData = cascadeGroups.reduce((acc, value, idx) => ({ ...acc, [value]: idx }), {
      id: '1',
      randomField: 'randomValue',
    });

    renderComponent({
      cascadeGroups,
      initialGroupColumn: cascadeGroups[0],
      row: { id: '1', depth: 0, original: rowData } as Row<any>,
      children: () => <div>Test Child</div>,
      onCascadeLeafNodeExpanded,
    });

    expect(onCascadeLeafNodeExpanded).toHaveBeenCalledWith({
      nodePath: [cascadeGroups[0]],
      nodePathMap: { group1: 0 },
      row: rowData,
    });
  });
});
