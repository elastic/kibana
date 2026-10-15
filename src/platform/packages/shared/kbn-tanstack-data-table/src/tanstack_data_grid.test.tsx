/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { servicesMock } from '../__mocks__/services';
import { TanStackDataGrid, type TanStackDataGridProps } from './tanstack_data_grid';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 48 })),
    getTotalSize: () => count * 48,
    measureElement: () => {},
    measure: () => {},
    scrollToIndex: () => {},
    scrollToOffset: () => {},
  }),
}));

const rows = [
  buildDataTableRecord({ _id: 'debug', _index: 'test', _source: { message: 'a' } }, dataViewMock),
  buildDataTableRecord({ _id: 'error', _index: 'test', _source: { message: 'b' } }, dataViewMock),
];

const renderGrid = (props: Partial<TanStackDataGridProps> = {}) =>
  renderWithI18n(
    <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve([])}>
      <TanStackDataGrid
        rows={rows}
        columns={['message']}
        dataView={dataViewMock}
        showTimeCol={false}
        services={servicesMock}
        loadingState={DataLoadingState.loaded}
        {...props}
      />
    </CellActionsProvider>
  );

describe('TanStackDataGrid', () => {
  describe('row indicator', () => {
    it('renders a colorIndicator column with the label of each row', () => {
      renderGrid({
        getRowIndicator: (row) => ({
          color: 'red',
          label: row.raw._id === 'error' ? 'Error' : 'Debug',
        }),
      });

      expect(screen.getByTestId('dataGridHeaderCell-colorIndicator')).toBeInTheDocument();
      expect(
        screen.getAllByTestId('unifiedDataTableRowColorIndicatorCell').map((el) => el.title)
      ).toEqual(['Debug', 'Error']);
    });

    it('does not render the column without a row indicator', () => {
      renderGrid();

      expect(screen.queryByTestId('dataGridHeaderCell-colorIndicator')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDataTableRowColorIndicatorCell')).not.toBeInTheDocument();
    });
  });

  it('wraps a custom summary renderer in the cell value element', () => {
    renderGrid({
      columns: [],
      externalCustomRenderers: { _source: () => <span>custom summary</span> },
    });

    const [summary] = screen.getAllByText('custom summary');
    expect(summary.closest('.unifiedDataTable__cellValue')).not.toBeNull();
  });
});
