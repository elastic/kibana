/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { screen, render } from '@testing-library/react';
import { EuiDataGridCellPopoverElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { CellPopoverHost } from './cell_popover_host';
import { createPartialObjectMock } from '../utils/test';
import { mockRenderContext } from '../mocks/context.mock';

const props = createPartialObjectMock<EuiDataGridCellPopoverElementProps>({
  rowIndex: 0,
  DefaultCellPopover: jest.fn().mockReturnValue(<div data-test-subj="defaultCellPopover" />),
});

describe('CellPopoverHost', () => {
  it('should render the renderCellPopover when provided', () => {
    render(
      <AlertsTableContextProvider
        value={{
          ...mockRenderContext,
          renderCellPopover: jest.fn(() => <div data-test-subj="renderCellPopover" />),
        }}
      >
        <CellPopoverHost {...props} />
      </AlertsTableContextProvider>
    );
    expect(screen.getByTestId('renderCellPopover')).toBeInTheDocument();
  });

  it('should catch errors from the custom CellPopover', async () => {
    const CustomCellPopover = () => {
      useEffect(() => {
        throw new Error('test error');
      }, []);
      return null;
    };
    render(
      <IntlProvider locale="en">
        <AlertsTableContextProvider
          value={{
            ...mockRenderContext,
            renderCellPopover: CustomCellPopover,
          }}
        >
          <CellPopoverHost {...props} />
        </AlertsTableContextProvider>
      </IntlProvider>
    );
    expect(await screen.findByTestId('errorCell')).toBeInTheDocument();
  });

  it('should render the DefaultCellPopover when renderCellPopover is not provided', () => {
    render(
      <AlertsTableContextProvider value={mockRenderContext}>
        <CellPopoverHost {...props} />
      </AlertsTableContextProvider>
    );
    expect(screen.getByTestId('defaultCellPopover')).toBeInTheDocument();
  });
});
