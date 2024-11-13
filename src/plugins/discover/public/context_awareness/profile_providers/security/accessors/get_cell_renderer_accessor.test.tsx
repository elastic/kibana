/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { SecuritySolutionCellRendererFeature } from '@kbn/discover-shared-plugin/public';
import { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { createCellRendererAccessor } from './get_cell_renderer_accessor';
import { render } from '@testing-library/react';

const cellRendererFeature: SecuritySolutionCellRendererFeature = {
  id: 'security-solution-cell-renderer',
  getRenderer: async () => (fieldName: string) => {
    if (fieldName === 'host.name') {
      return (props: DataGridCellValueElementProps) => {
        return <div data-test-subj="cell-render-feature">{props.columnId}</div>;
      };
    }
  },
};

const mockCellProps = {
  columnId: 'host.name',
  row: {
    id: '1',
    raw: {},
    flattened: {},
  },
} as DataGridCellValueElementProps;

describe('getCellRendererAccessort', () => {
  it('should return a cell renderer', async () => {
    const getCellRenderer = await createCellRendererAccessor(cellRendererFeature);
    expect(getCellRenderer).toBeDefined();
    const CellRenderer = getCellRenderer?.('host.name') as React.FC<DataGridCellValueElementProps>;
    expect(CellRenderer).toBeDefined();
    const { getByTestId } = render(<CellRenderer {...mockCellProps} />);
    expect(getByTestId('cell-render-feature')).toBeVisible();
    expect(getByTestId('cell-render-feature')).toHaveTextContent('host.name');
  });

  it('should return undefined if cellRendererFeature is not defined', async () => {
    const getCellRenderer = await createCellRendererAccessor();
    expect(getCellRenderer).toBeUndefined();
  });

  it('should return undefined if cellRendererGetter returns undefined', async () => {
    const getCellRenderer = await createCellRendererAccessor(cellRendererFeature);
    const cellRenderer = getCellRenderer?.('user.name');
    expect(cellRenderer).toBeUndefined();
  });
});
