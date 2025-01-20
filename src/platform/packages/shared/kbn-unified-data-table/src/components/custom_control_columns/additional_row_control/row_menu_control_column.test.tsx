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
import { render, screen } from '@testing-library/react';
import { getRowMenuControlColumn } from './row_menu_control_column';
import { dataTableContextMock } from '../../../../__mocks__/table_context';
import { mockRowAdditionalLeadingControls } from '../../../../__mocks__/external_control_columns';
import { UnifiedDataTableContext } from '../../../table_context';

describe('getRowMenuControlColumn', () => {
  const contextMock = {
    ...dataTableContextMock,
  };

  it('should render the component', () => {
    const mockClick = jest.fn();
    const props = {
      id: 'test_row_menu_control',
      headerAriaLabel: 'row control',
      renderControl: jest.fn((Control, rowProps) => (
        <Control
          label={`test-${rowProps.rowIndex}`}
          tooltipContent={`test-${rowProps.rowIndex}`}
          iconType="heart"
          onClick={mockClick}
        />
      )),
    };
    const rowMenuControlColumn = getRowMenuControlColumn([
      props,
      mockRowAdditionalLeadingControls[0],
      mockRowAdditionalLeadingControls[1],
    ]);
    const RowMenuControlColumn =
      rowMenuControlColumn.rowCellRender as React.FC<EuiDataGridCellValueElementProps>;
    render(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <RowMenuControlColumn
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
    const menuButton = screen.getByTestId('unifiedDataTable_test_row_menu_control');
    expect(menuButton).toBeInTheDocument();

    menuButton.click();

    expect(screen.getByTestId('exampleRowControl-visBarVerticalStacked')).toBeInTheDocument();
    expect(screen.getByTestId('exampleRowControl-heart')).toBeInTheDocument();

    const button = screen.getByTestId('unifiedDataTable_rowMenu_test_row_menu_control');
    expect(button).toBeInTheDocument();

    button.click();
    expect(mockClick).toHaveBeenCalledWith({ record: contextMock.getRowByIndex(1), rowIndex: 1 });
  });
});
