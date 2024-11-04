/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getRowControlColumn } from './row_control_column';
import { dataTableContextMock } from '../../../../__mocks__/table_context';
import { UnifiedDataTableContext } from '../../../table_context';

describe('getRowControlColumn', () => {
  const contextMock = {
    ...dataTableContextMock,
  };

  it('should render the Control button', () => {
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

    expect(mockClick).toHaveBeenCalledWith({ record: contextMock.getRowByIndex(1), rowIndex: 1 });
  });

  it('should wrap the Control button with a tooltip when tooltipContent is passed', async () => {
    const props = {
      id: 'test_row_control',
      headerAriaLabel: 'row control',
      renderControl: jest.fn((Control, rowProps) => (
        <Control
          label={`test-${rowProps.rowIndex}`}
          tooltipContent="Control tooltip text!"
          iconType="heart"
          onClick={undefined}
        />
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

    await userEvent.hover(button);
    await waitFor(() => {
      expect(screen.getByText('Control tooltip text!')).toBeInTheDocument();
    });
  });
});
