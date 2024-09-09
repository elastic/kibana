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
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FieldRow } from './field_row';
import { getPinColumnControl } from './get_pin_control';
import { buildDataTableRecord } from '@kbn/discover-utils';

describe('getPinControl', () => {
  const rows: FieldRow[] = [
    new FieldRow({
      name: 'message',
      flattenedValue: 'flattenedField',
      hit: buildDataTableRecord(
        {
          _ignored: [],
          _index: 'test',
          _id: '1',
          _source: {
            message: 'test',
          },
        },
        dataView
      ),
      dataView,
      fieldFormats: {} as FieldFormatsStart,
      isPinned: false,
      columnsMeta: undefined,
    }),
  ];

  it('should render correctly', () => {
    const onTogglePinned = jest.fn();
    const control = getPinColumnControl({ rows, onTogglePinned });
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

    expect(onTogglePinned).toHaveBeenCalledWith('message');
  });
});
