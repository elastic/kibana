/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { getRowControlColumn } from './row_control_column';
import { dataTableContextMock } from '../../../../__mocks__/table_context';
import { UnifiedDataTableContext } from '../../../table_context';

describe('getRowControlColumn', () => {
  const contextMock = {
    ...dataTableContextMock,
  };

  it('should render the component', () => {
    const mockClick = jest.fn();
    const props = {
      id: 'test_row_control',
      headerAriaLabel: 'row control',
      renderControl: jest.fn((Control, rowProps) => (
        <Control label={`test-${rowProps.rowIndex}`} iconType="heart" onClick={mockClick} />
      )),
    };
    const rowControlColumn = getRowControlColumn(props);
    const RowControlColumn =
      rowControlColumn.rowCellRender as React.FC<EuiDataGridCellValueElementProps>;
    render(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <RowControlColumn
          rowIndex={1}
          setCellProps={jest.fn()}
          columnId={props.id}
          colIndex={0}
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    const button = screen.getByTestId('unifiedDataTable_rowControl_test_row_control');
    expect(button).toBeInTheDocument();

    button.click();

    expect(mockClick).toHaveBeenCalledWith({ record: contextMock.rows[1], rowIndex: 1 });
  });
});
