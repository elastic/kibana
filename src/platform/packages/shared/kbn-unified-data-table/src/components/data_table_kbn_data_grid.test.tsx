/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { buildDataViewMock, deepMockedFields, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  BUTTON_NEXT_TEST_SUBJ,
  BUTTON_TEST_SUBJ,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
  INPUT_TEST_SUBJ,
} from '@kbn/data-grid-in-table-search';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { servicesMock } from '../../__mocks__/services';
import type { UnifiedDataTableProps } from './data_table';
import { DataLoadingState, UnifiedDataTable } from './data_table';

jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  useDataGridColumnsCellActions: () => [],
}));

const dataViewMock = buildDataViewMock({
  fields: deepMockedFields,
  name: 'the-data-view',
  timeFieldName: '@timestamp',
});

const getProps = (): UnifiedDataTableProps => ({
  ariaLabelledBy: '',
  columns: ['message', 'extension'],
  dataView: dataViewMock,
  expandedDoc: undefined,
  loadingState: DataLoadingState.loaded,
  onFilter: jest.fn(),
  onResize: jest.fn(),
  onSetColumns: jest.fn(),
  onSort: jest.fn(),
  rows: esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock)),
  sampleSizeState: 30,
  searchDescription: '',
  searchTitle: '',
  services: {
    fieldFormats: servicesMock.fieldFormats,
    uiSettings: servicesMock.uiSettings,
    dataViewFieldEditor: servicesMock.dataViewFieldEditor,
    toastNotifications: servicesMock.toastNotifications,
    storage: servicesMock.storage as unknown as Storage,
    data: servicesMock.data,
    theme: servicesMock.theme,
    uiActions: servicesMock.uiActions,
  },
  setExpandedDoc: jest.fn(),
  renderDocumentView: jest.fn(),
  settings: {},
  showTimeCol: true,
  sort: [],
  isKbnDataGridEnabled: true,
});

const DataTable = (props: Partial<UnifiedDataTableProps>) => (
  <IntlProvider locale="en">
    <KibanaContextProvider services={servicesMock}>
      <UnifiedDataTable {...getProps()} {...props} />
    </KibanaContextProvider>
  </IntlProvider>
);

const openColumnMenu = async (columnId: string) => {
  await userEvent.hover(screen.getByTestId(`dataGridHeaderCell-${columnId}`));
  await userEvent.click(await screen.findByTestId(`dataGridHeaderCellActionButton-${columnId}`));
  const menu = await screen.findByTestId(`dataGridHeaderCellActionGroup-${columnId}`);
  await waitFor(() => expect(getComputedStyle(menu).pointerEvents).not.toBe('none'));
  return menu;
};

describe('UnifiedDataTable with @kbn/data-grid', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders the columns, the control columns and the documents', async () => {
    render(<DataTable />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('data-gridcell-column-id', 'select');
    expect(screen.getByTestId('dataGridHeaderCell-@timestamp')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-message')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-extension')).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    // Not EuiDataGrid.
    expect(document.querySelector('.euiDataGridRowCell__content')).not.toBeInTheDocument();
  });

  it('expands a document with its expand button', async () => {
    const setExpandedDoc = jest.fn();
    render(<DataTable setExpandedDoc={setExpandedDoc} />);

    const expandButton = (await screen.findAllByTestId('docTableExpandToggleColumn'))[0];
    await userEvent.click(expandButton);
    expect(setExpandedDoc).toHaveBeenCalled();
  });

  it('sorts a column from its header menu', async () => {
    const onSort = jest.fn();
    render(<DataTable onSort={onSort} />);

    await userEvent.click(
      within(await openColumnMenu('extension')).getByTestId('gridSortAscendingButton')
    );
    expect(onSort).toHaveBeenCalledWith([['extension', 'asc']]);
  });

  it('removes a column from its header menu', async () => {
    const onSetColumns = jest.fn();
    render(<DataTable onSetColumns={onSetColumns} />);

    await userEvent.click(
      within(await openColumnMenu('extension')).getByTestId('unifiedDataTableRemoveColumn')
    );
    // The time column is part of the visible columns, when the table shows it.
    expect(onSetColumns).toHaveBeenCalledWith(['@timestamp', 'message'], false);
  });

  it('expands a cell into the popover of UnifiedDataTable without looping', async () => {
    render(<DataTable columns={['bytes']} />);

    const cell = document.querySelector<HTMLElement>(
      "[role='gridcell'][data-gridcell-column-id='bytes']"
    )!;
    await userEvent.hover(cell);
    await userEvent.click(await within(cell).findByTestId('kbnDataGridCellActionsButton'));

    const popover = await screen.findByTestId('euiDataGridExpansionPopover');
    expect(popover).toHaveClass('unifiedDataTable__cellPopover');
  });

  describe('rendering', () => {
    it('does not render the cells again when the sort changes, only the headers', () => {
      let renders = 0;
      const Counted = () => {
        renders++;
        return <span>counted</span>;
      };
      // Stable props, like a caller that memoizes them: `DataTable` would build new ones.
      const props: UnifiedDataTableProps = {
        ...getProps(),
        columns: ['bytes'],
        externalCustomRenderers: { bytes: Counted },
      };
      const StableTable = ({ sort }: { sort: UnifiedDataTableProps['sort'] }) => (
        <IntlProvider locale="en">
          <KibanaContextProvider services={servicesMock}>
            <UnifiedDataTable {...props} sort={sort} />
          </KibanaContextProvider>
        </IntlProvider>
      );
      const { rerender } = render(<StableTable sort={[]} />);
      expect(renders).toBeGreaterThan(0);
      const rendersAfterMount = renders;

      rerender(<StableTable sort={[['bytes', 'asc']]} />);

      expect(screen.getByTestId('dataGridHeaderCell-bytes')).toHaveAttribute(
        'aria-sort',
        'ascending'
      );
      expect(renders).toBe(rendersAfterMount);
    });
  });

  describe('in-table search', () => {
    const search = async (term: string) => {
      await userEvent.click(screen.getByTestId(BUTTON_TEST_SUBJ));
      const input = screen.getByTestId(INPUT_TEST_SUBJ);
      await userEvent.click(input);
      await userEvent.paste(term);
    };

    it('finds the matches, highlights them and marks the active one', async () => {
      render(<DataTable columns={['bytes']} enableInTableSearch />);

      await search('50');

      await waitFor(() => {
        // 3 results for the `bytes` column with value `50`, like with EuiDataGrid.
        expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
      });
      await waitFor(() => {
        const highlights = screen.getAllByText('50');
        expect(highlights.length).toBeGreaterThan(0);
        expect(
          highlights.every(
            (highlight) =>
              highlight.tagName === 'MARK' && highlight.classList.contains(HIGHLIGHT_CLASS_NAME)
          )
        ).toBe(true);
      });

      // The styles of the active match look its cell up like EuiDataGrid's cells are marked.
      const activeCell = document.querySelector(
        ".euiDataGridRowCell[data-gridcell-row-index][data-gridcell-column-id='bytes']"
      );
      expect(activeCell).toBeInTheDocument();

      await userEvent.click(screen.getByTestId(BUTTON_NEXT_TEST_SUBJ));
      await waitFor(() => {
        expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('2/3');
      });
    });
  });

  it('shows the toolbar controls', () => {
    render(<DataTable />);
    expect(screen.getByTestId('dataGridColumnSelectorButton')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridColumnSortingButton')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridDisplaySelectorButton')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridFullScreenButton')).toBeInTheDocument();
  });
});
