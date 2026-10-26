/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dataTableContextMock } from '../../../../__mocks__/table_context';
import { getColorIndicatorControlColumn } from './color_indicator_control_column';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { UnifiedDataTableContext } from '../../../table_context';

describe('ColorIndicatorControlColumn', () => {
  it('should render the component', () => {
    const getRowIndicator = jest.fn(() => ({ color: 'red', label: 'error' }));
    const column = getColorIndicatorControlColumn({
      getRowIndicator,
    });
    const ColorIndicatorControlColumn = column.rowCellRender;

    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <ColorIndicatorControlColumn
          colIndex={0}
          columnId="color_indicator"
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
          rowIndex={1}
          setCellProps={jest.fn()}
        />
      </UnifiedDataTableContext.Provider>
    );

    expect(screen.getByTestId('unifiedDataTableRowColorIndicatorCell')).toBeVisible();
    expect(getRowIndicator).toHaveBeenCalledWith(
      dataTableContextMock.getRowByIndex(1),
      expect.any(Object)
    );
  });
});
