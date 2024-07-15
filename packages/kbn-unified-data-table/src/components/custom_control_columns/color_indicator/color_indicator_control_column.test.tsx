/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { getColorIndicatorControlColumn } from './color_indicator_control_column';
import { dataTableContextMock } from '../../../../__mocks__/table_context';
import { UnifiedDataTableContext } from '../../../table_context';

describe('ColorIndicatorControlColumn', () => {
  const contextMock = {
    ...dataTableContextMock,
  };

  it('should render the component', () => {
    const getRowIndicator = jest.fn(() => ({ color: 'red', label: 'error' }));
    const column = getColorIndicatorControlColumn({
      getRowIndicator,
    });
    const ColorIndicatorControlColumn =
      column.rowCellRender as React.FC<EuiDataGridCellValueElementProps>;
    mountWithIntl(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ColorIndicatorControlColumn
          rowIndex={1}
          setCellProps={jest.fn()}
          columnId="color_indicator"
          colIndex={0}
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
        />
      </UnifiedDataTableContext.Provider>
    );
    expect(getRowIndicator).toHaveBeenCalledWith(contextMock.rows[1], expect.any(Object));
  });
});
