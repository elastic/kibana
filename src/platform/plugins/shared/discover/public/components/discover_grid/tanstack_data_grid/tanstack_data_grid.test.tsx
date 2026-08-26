/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import {
  dataViewMock,
  dataViewMockWithTimeField,
  esHitsMock,
} from '@kbn/discover-utils/src/__mocks__';
import { TanStackDataGrid } from './tanstack_data_grid';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

const services = createDiscoverServicesMock();
import { DiscoverTestProvider } from '../../../__mocks__/test_provider';

const rows = esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock));
const [expandedDoc] = rows;

const renderGrid = (override: Partial<React.ComponentProps<typeof TanStackDataGrid>> = {}) => {
  const props: React.ComponentProps<typeof TanStackDataGrid> = {
    rows,
    columns: ['message'],
    dataView: dataViewMock,
    showTimeCol: false,
    expandedDoc,
    setExpandedDoc: jest.fn(),
    services,
    ...override,
  };

  return render(
    <DiscoverTestProvider>
      <TanStackDataGrid {...props} />
    </DiscoverTestProvider>
  );
};

describe('TanStackDataGrid document view', () => {
  it('does not call renderDocumentView when it is the external sentinel', async () => {
    const setRenderDocumentViewMeta = jest.fn();

    expect(() =>
      renderGrid({
        renderDocumentView: 'external',
        setRenderDocumentViewMeta,
      })
    ).not.toThrow();

    await waitFor(() => {
      expect(setRenderDocumentViewMeta).toHaveBeenLastCalledWith({
        displayedColumns: ['message'],
        displayedRows: rows,
      });
    });

    expect(screen.queryByTestId('test-document-view')).not.toBeInTheDocument();
  });

  it('clears document view metadata when the expanded doc is closed', async () => {
    const setRenderDocumentViewMeta = jest.fn();
    const props = {
      renderDocumentView: 'external' as const,
      setRenderDocumentViewMeta,
    };

    const { rerender } = renderGrid(props);

    await waitFor(() => {
      expect(setRenderDocumentViewMeta).toHaveBeenCalled();
    });

    setRenderDocumentViewMeta.mockClear();

    rerender(
      <DiscoverTestProvider>
        <TanStackDataGrid
          rows={rows}
          columns={['message']}
          dataView={dataViewMock}
          showTimeCol={false}
          expandedDoc={undefined}
          setExpandedDoc={jest.fn()}
          services={services}
          {...props}
        />
      </DiscoverTestProvider>
    );

    await waitFor(() => {
      expect(setRenderDocumentViewMeta).toHaveBeenLastCalledWith(undefined);
    });
  });

  it('renders the document view callback when a function is provided', () => {
    const renderDocumentView = jest.fn((hit: DataTableRecord) => (
      <div data-test-subj="test-document-view">{hit.id}</div>
    ));
    const columnsMeta = { message: { type: 'string' as const } };

    renderGrid({
      columnsMeta,
      renderDocumentView,
    });

    expect(screen.getByTestId('test-document-view')).toHaveTextContent(expandedDoc.id);
    expect(renderDocumentView).toHaveBeenLastCalledWith(
      expandedDoc,
      rows,
      ['message'],
      columnsMeta
    );
  });
});

describe('TanStackDataGrid columns', () => {
  it('prepends the data view time field when adding columns', () => {
    renderGrid({
      columns: ['extension'],
      dataView: dataViewMockWithTimeField,
      showTimeCol: true,
    });

    expect(screen.getByTestId('tanstackGridWrapper')).toHaveTextContent('timestamp');
    expect(screen.getByTestId('tanstackGridWrapper')).toHaveTextContent('extension');
  });

  it('renders a pinned summary beside regular table columns', () => {
    renderGrid({ columns: ['message', '_source'], expandedDoc: undefined });

    expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '4');
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });
});

describe('TanStackDataGrid summary column row height', () => {
  it('uses EUI typography values for pixel row heights', () => {
    renderGrid({ expandedDoc: undefined });

    const rowMinHeight = parseFloat(
      screen.getByTestId('tanstackGridWrapper').style.getPropertyValue('--tsg-row-min-height')
    );

    expect(rowMinHeight).toBeGreaterThan(20);
  });

  it('applies body cell lines to the summary column clamp', () => {
    const { rerender } = renderGrid({
      columns: ['_source'],
      expandedDoc: undefined,
      rowHeightState: 1,
    });

    expect(screen.getByTestId('tanstackGridWrapper')).toHaveStyle({
      '--tsg-body-max-lines': '1',
    });

    rerender(
      <DiscoverTestProvider>
        <TanStackDataGrid
          rows={rows}
          columns={['_source']}
          dataView={dataViewMock}
          showTimeCol={false}
          rowHeightState={5}
          services={services}
        />
      </DiscoverTestProvider>
    );

    expect(screen.getByTestId('tanstackGridWrapper')).toHaveStyle({
      '--tsg-body-max-lines': '5',
    });
  });

  it('disables line clamping when row height is auto', () => {
    renderGrid({
      columns: ['_source'],
      expandedDoc: undefined,
      rowHeightState: -1,
    });

    expect(screen.getByTestId('tanstackGridWrapper')).toHaveStyle({
      '--tsg-body-max-lines': 'none',
    });
  });
});

describe('TanStackDataGrid EUI parity', () => {
  it('keeps selection checked and exposes the selected documents toolbar', () => {
    renderGrid({ expandedDoc: undefined });

    const selectAllCheckbox = screen.getByRole('checkbox');
    fireEvent.click(selectAllCheckbox);

    expect(selectAllCheckbox).toBeChecked();
    expect(screen.getByTestId('unifiedDataTableSelectionBtn')).toHaveTextContent(
      String(rows.length)
    );
  });

  it('renders the EUI-style summary and toolbar header controls', () => {
    renderGrid({
      columns: ['_source'],
      dataView: dataViewMockWithTimeField,
      showTimeCol: true,
      expandedDoc: undefined,
      toolbarLeftSide: <div data-test-subj="toolbarLeftSide">2 documents | View as</div>,
      toolbarTrailingControl: <button data-test-subj="toolbarTrailingControl">Save</button>,
    });

    expect(screen.getByTestId('toolbarLeftSide')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridColumnSelectorButton')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridColumnSortingButton')).toBeInTheDocument();
    expect(screen.getByTestId('dataGridKeyboardShortcutsButton')).toBeInTheDocument();
    expect(screen.getByTestId('toolbarTrailingControl')).toBeInTheDocument();
  });

  it('groups profile-provided controls in the leading actions column', () => {
    renderGrid({
      expandedDoc: undefined,
      rowAdditionalLeadingControls: [
        {
          id: 'customAction',
          render: (Control) => (
            <Control iconType="starEmpty" label="Custom action" onClick={jest.fn()} />
          ),
        },
      ],
    });

    expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '3');
  });

  it('uses the EUI full-screen class and reports full-screen changes', () => {
    const onFullScreenChange = jest.fn();
    renderGrid({ expandedDoc: undefined, onFullScreenChange });

    fireEvent.click(screen.getByTestId('dataGridFullScreenButton'));

    expect(screen.getByTestId('tanstackGridWrapper')).toHaveClass('euiDataGrid--fullScreen');
    expect(onFullScreenChange).toHaveBeenLastCalledWith(true);
  });

  it('shows the shared sample-size setting', () => {
    renderGrid({
      expandedDoc: undefined,
      sampleSizeState: 500,
      onUpdateSampleSize: jest.fn(),
    });

    fireEvent.click(screen.getByTestId('dataGridDensityButton'));

    expect(screen.getAllByTestId('unifiedDataTableSampleSizeInput')).toHaveLength(2);
  });

  it('opens search inline in the toolbar like EuiDataGrid', () => {
    renderGrid({ expandedDoc: undefined });

    fireEvent.click(screen.getByTestId('startInTableSearchButton'));

    expect(screen.getByTestId('inTableSearchInput')).toBeInTheDocument();
    expect(screen.getByTestId('inTableSearchMatchesCounter')).toHaveTextContent('0/0');
  });

  it('pins the summary column from the columns popover', () => {
    const onSetColumns = jest.fn();
    renderGrid({ expandedDoc: undefined, onSetColumns, showSummaryColumnToggle: true });

    fireEvent.click(screen.getByTestId('dataGridColumnSelectorButton'));
    fireEvent.click(screen.getByTestId('columnSelectorShowSummaryColumn'));

    expect(onSetColumns).toHaveBeenCalledWith(['message', '_source'], true);
  });

  it('matches the EUI selected documents menu and selected-only mode', () => {
    renderGrid({ expandedDoc: undefined, enableComparisonMode: true });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByTestId('unifiedDataTableSelectionBtn'));

    expect(screen.getByText('Compare selected')).toBeInTheDocument();
    expect(screen.getByText('Copy selection as text')).toBeInTheDocument();
    expect(screen.getByText('Copy selection as Markdown')).toBeInTheDocument();
    expect(screen.getByText('Copy documents as JSON')).toBeInTheDocument();
    expect(screen.getByText('Show selected documents only')).toBeInTheDocument();
    expect(screen.getByText('Clear selection')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show selected documents only'));
    fireEvent.click(screen.getByTestId('unifiedDataTableSelectionBtn'));

    expect(screen.getByText('Show all documents')).toBeInTheDocument();
  });

  it('opens document comparison for multiple selected rows', async () => {
    renderGrid({ expandedDoc: undefined, enableComparisonMode: true });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByTestId('unifiedDataTableSelectionBtn'));
    fireEvent.click(screen.getByText('Compare selected'));

    expect(await screen.findByTestId('unifiedDataTableCompareDocuments')).toBeInTheDocument();
  });
});
