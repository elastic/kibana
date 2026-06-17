/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { ExpandButton } from './data_table_expand_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { UnifiedDataTableContext } from '../table_context';

describe('Data table view button ', () => {
  it('when no document is expanded, setExpanded is called with current document', async () => {
    renderWithI18n(
      <UnifiedDataTableContext.Provider value={dataTableContextMock}>
        <ExpandButton
          colIndex={0}
          columnId="test"
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
          rowIndex={0}
          setCellProps={jest.fn()}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByTestId('docTableExpandToggleColumn'));

    expect(dataTableContextMock.setExpanded).toHaveBeenCalledWith(
      dataTableContextMock.getRowByIndex(0)
    );
  });

  it('when the current document is expanded, setExpanded is called with undefined', async () => {
    const contextMock = {
      ...dataTableContextMock,
      expanded: dataTableContextMock.getRowByIndex(0),
    };

    renderWithI18n(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ExpandButton
          colIndex={0}
          columnId="test"
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
          rowIndex={0}
          setCellProps={jest.fn()}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByTestId('docTableExpandToggleColumn'));

    expect(contextMock.setExpanded).toHaveBeenCalledWith(undefined);
  });
  it('when another document is expanded, setExpanded is called with the current document', async () => {
    const contextMock = {
      ...dataTableContextMock,
      expanded: dataTableContextMock.getRowByIndex(0),
    };

    renderWithI18n(
      <UnifiedDataTableContext.Provider value={contextMock}>
        <ExpandButton
          colIndex={0}
          columnId="test"
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
          rowIndex={1}
          setCellProps={jest.fn()}
        />
      </UnifiedDataTableContext.Provider>
    );

    await userEvent.click(screen.getByTestId('docTableExpandToggleColumn'));

    expect(contextMock.setExpanded).toHaveBeenCalledWith(dataTableContextMock.getRowByIndex(1));
  });
});
