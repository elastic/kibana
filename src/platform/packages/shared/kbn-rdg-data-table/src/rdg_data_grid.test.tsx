/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataLoadingState } from '@kbn/unified-data-table';
import { createServicesMock } from '@kbn/unified-data-table/__mocks__/services';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { RdgDataGrid, type RdgDataGridProps } from './rdg_data_grid';

const services = { ...createServicesMock(), storage: new Storage(window.localStorage) };

const rows = [
  buildDataTableRecord({ _id: 'debug', _index: 'test', _source: { message: 'a' } }, dataViewMock),
  buildDataTableRecord({ _id: 'error', _index: 'test', _source: { message: 'b' } }, dataViewMock),
];

const renderGrid = (props: Partial<RdgDataGridProps> = {}) =>
  renderWithI18n(
    <RdgDataGrid
      rows={rows}
      columns={['message']}
      dataView={dataViewMock}
      showTimeCol={false}
      services={services}
      loadingState={DataLoadingState.loaded}
      {...props}
    />
  );

// react-data-grid sizes its viewport from the DOM, which jsdom does not lay out.
beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  // Called when a cell gets focus.
  Element.prototype.scrollIntoView ??= jest.fn();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('RdgDataGrid', () => {
  it('renders the rows with the test attributes of the other grids', () => {
    renderGrid();

    const table = screen.getByTestId('discoverDocTable');
    expect(table).toHaveAttribute('data-table-loaded', 'true');
    expect(table).toHaveAttribute('data-grid-implementation', 'rdg');
    expect(table.querySelectorAll('[data-grid-visible-row-index]')).toHaveLength(2);
    const messageCells = table.querySelectorAll(
      '[data-test-subj="dataGridRowCell"][data-gridcell-column-id="message"]'
    );
    expect(Array.from(messageCells, (cell) => cell.textContent)).toEqual(['a', 'b']);
  });

  it('selects a row from its checkbox', () => {
    renderGrid();

    const checkbox = screen.getByTestId('dscGridSelectDoc-test::debug::');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByTestId('dscGridSelectDoc-test::error::')).not.toBeChecked();
  });

  it('toggles the document details', () => {
    const setExpandedDoc = jest.fn();
    renderGrid({ setExpandedDoc });

    const [firstToggle] = screen.getAllByTestId('docTableExpandToggleColumn');
    fireEvent.click(firstToggle);

    expect(setExpandedDoc).toHaveBeenCalledWith(rows[0]);
  });

  it('renders a row indicator for each row', () => {
    renderGrid({
      getRowIndicator: (row) => ({
        color: 'red',
        label: row.raw._id === 'error' ? 'Error' : 'Debug',
      }),
    });

    expect(
      screen.getAllByTestId('unifiedDataTableRowColorIndicatorCell').map((el) => el.title)
    ).toEqual(['Debug', 'Error']);
  });

  it('renders the empty state without rows', () => {
    renderGrid({ rows: [] });

    expect(screen.getByTestId('discoverDocTable')).toHaveAttribute('data-document-number', '0');
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
