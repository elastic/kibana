/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { TableRow } from './table_cell_actions';
import { getPinColumnControl } from './get_pin_control';
import { EuiDataGridCellValueElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';

describe('getPinControl', () => {
  const rows: TableRow[] = [
    {
      action: {
        onFilter: jest.fn(),
        flattenedField: 'flattenedField',
        onToggleColumn: jest.fn(),
      },
      field: {
        pinned: true,
        onTogglePinned: jest.fn(),
        field: 'message',
        fieldMapping: new DataViewField({
          type: 'keyword',
          name: 'message',
          searchable: true,
          aggregatable: true,
        }),
        fieldType: 'keyword',
        displayName: 'message',
        scripted: false,
      },
      value: {
        ignored: undefined,
        formattedValue: 'test',
      },
    },
  ];

  it('should render correctly', () => {
    const control = getPinColumnControl({ rows });
    const Cell = control.rowCellRender as React.FC<EuiDataGridCellValueElementProps>;
    render(
      <Cell
        rowIndex={0}
        columnId="test"
        setCellProps={jest.fn()}
        colIndex={0}
        isDetails={false}
        isExpanded={false}
        isExpandable={false}
      />
    );

    screen.getByTestId('unifiedDocViewer_pinControlButton_message').click();

    expect(rows[0].field.onTogglePinned).toHaveBeenCalledWith('message');
  });
});
