/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { EsqlSource } from '@kbn/data-source';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import DataGrid from './data_grid';
import type { ESQLDataGridState } from './types';

interface MockUnifiedDataTableProps {
  columns: string[];
  rows?: Array<{ flattened: Record<string, unknown> }>;
  dataSource?: EsqlSource;
  renderCustomToolbar?: unknown;
  rowHeightState?: number;
  rowsPerPageState?: number;
  settings?: { columns?: Record<string, { width?: number }> };
  onResize?: (colSettings: { columnId: string; width: number | undefined }) => void;
  onSetColumns: (columns: string[]) => void;
  onUpdateRowHeight?: (rowHeight: number) => void;
  onUpdateRowsPerPage?: (rowsPerPage: number) => void;
  initialState?: { pageIndex?: number; scrollLeft?: number };
  onInitialStateChange?: (state: { pageIndex?: number; scrollLeft?: number }) => void;
}

const mockUnifiedDataTableProps = jest.fn<void, [MockUnifiedDataTableProps]>();

jest.mock('@kbn/unified-data-table', () => {
  const actual = jest.requireActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: (props: MockUnifiedDataTableProps) => {
      mockUnifiedDataTableProps(props);
      return (
        <div
          data-test-subj="mockUnifiedDataTable"
          data-has-custom-toolbar={String(Boolean(props.renderCustomToolbar))}
          data-source-query={props.dataSource?.query}
          data-source-columns={props.dataSource
            ?.getColumns()
            .map(({ name }) => name)
            .join(',')}
          data-row-keys={props.rows?.[0] ? Object.keys(props.rows[0].flattened).join(',') : ''}
        >
          {props.columns.join(',')}
        </div>
      );
    },
  };
});

const getLatestTableProps = (): MockUnifiedDataTableProps => {
  const { calls } = mockUnifiedDataTableProps.mock;
  return calls[calls.length - 1][0];
};

describe('DataGrid', () => {
  const data = dataPluginMock.createStartContract();
  const dataView = { toSpec: jest.fn() } as unknown as DataView;
  const core = coreMock.createStart();
  const fieldFormats = fieldFormatsServiceMock.createStartContract();
  const uiActions = uiActionsPluginMock.createStartContract();
  const query = { esql: 'from foo' };

  const column = (name: string): DatatableColumn => ({
    id: name,
    name,
    meta: { type: 'string' },
  });

  const renderGrid = (columns: DatatableColumn[]) =>
    render(
      <DataGrid
        core={core}
        data={data}
        uiActions={uiActions}
        fieldFormats={fieldFormats}
        rows={[]}
        dataView={dataView}
        query={query}
        isTableView
        columns={columns}
        isApproximate={false}
      />
    );

  it('keeps all-null columns in the table and off each row', async () => {
    render(
      <DataGrid
        core={core}
        data={data}
        uiActions={uiActions}
        fieldFormats={fieldFormats}
        rows={[['web']]}
        dataView={dataView}
        query={query}
        isTableView
        columns={[column('host'), { ...column('empty'), isNull: true }]}
        isApproximate={false}
      />
    );

    const grid = await screen.findByTestId('mockUnifiedDataTable');
    expect(grid).toHaveTextContent('host,empty');
    expect(grid).toHaveAttribute('data-row-keys', 'host');
  });

  it('renders the columns passed in props', async () => {
    renderGrid([column('a'), column('b')]);
    expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b');
  });

  it('gives the grid an ES|QL source of the query with the result columns', async () => {
    renderGrid([column('a'), column('b')]);
    const grid = await screen.findByTestId('mockUnifiedDataTable');
    expect(grid).toHaveAttribute('data-source-query', 'from foo');
    expect(grid).toHaveAttribute('data-source-columns', 'a,b');
  });

  it('updates the rendered columns when props.columns changes', async () => {
    const { rerender } = renderGrid([column('a'), column('b')]);
    expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b');

    rerender(
      <DataGrid
        core={core}
        data={data}
        uiActions={uiActions}
        fieldFormats={fieldFormats}
        rows={[]}
        dataView={dataView}
        query={query}
        isTableView
        columns={[column('b'), column('c')]}
        isApproximate={false}
      />
    );

    expect(screen.getByTestId('mockUnifiedDataTable')).toHaveTextContent('b,c');
    expect(screen.getByTestId('mockUnifiedDataTable')).toHaveAttribute(
      'data-source-columns',
      'b,c'
    );
  });

  it('keeps the previous column set when props.columns is re-created with the same names', async () => {
    const initialColumns = [column('a'), column('b')];
    const { rerender } = renderGrid(initialColumns);
    await screen.findByTestId('mockUnifiedDataTable');

    rerender(
      <DataGrid
        core={core}
        data={data}
        uiActions={uiActions}
        fieldFormats={fieldFormats}
        rows={[]}
        dataView={dataView}
        query={query}
        isTableView
        columns={[column('a'), column('b')]}
        isApproximate={false}
      />
    );

    expect(screen.getByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b');
  });

  describe('Open in Discover link', () => {
    const share = {
      url: { locators: { get: jest.fn(() => ({ getRedirectUrl: jest.fn() })) } },
    } as unknown as SharePluginStart;

    const renderWithShare = (showOpenInDiscoverLink?: boolean) =>
      render(
        <DataGrid
          core={core}
          data={data}
          uiActions={uiActions}
          fieldFormats={fieldFormats}
          share={share}
          rows={[]}
          dataView={dataView}
          query={query}
          isTableView
          columns={[column('a')]}
          isApproximate={false}
          showOpenInDiscoverLink={showOpenInDiscoverLink}
        />
      );

    it('renders the toolbar with the link by default', async () => {
      renderWithShare();
      expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveAttribute(
        'data-has-custom-toolbar',
        'true'
      );
    });

    it('omits the link when showOpenInDiscoverLink is false', async () => {
      renderWithShare(false);
      expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveAttribute(
        'data-has-custom-toolbar',
        'false'
      );
    });
  });

  describe('state persistence', () => {
    const renderWithState = ({
      initialState,
      onStateChange,
    }: {
      initialState?: ESQLDataGridState;
      onStateChange?: (state: ESQLDataGridState) => void;
    }) =>
      render(
        <DataGrid
          core={core}
          data={data}
          uiActions={uiActions}
          fieldFormats={fieldFormats}
          rows={[]}
          dataView={dataView}
          query={query}
          isTableView
          columns={[column('a'), column('b'), column('c')]}
          isApproximate={false}
          initialState={initialState}
          onStateChange={onStateChange}
        />
      );

    it('restores the grid from initialState', async () => {
      renderWithState({
        initialState: {
          columns: ['c', 'a'],
          columnWidths: { a: 120 },
          rowHeight: 3,
          rowsPerPage: 25,
        },
      });

      expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveTextContent('c,a');
      const { rowHeightState, rowsPerPageState, settings } = getLatestTableProps();
      expect(rowHeightState).toBe(3);
      expect(rowsPerPageState).toBe(25);
      expect(settings).toEqual({ columns: { a: { width: 120 } } });
    });

    it('drops restored columns that are no longer in the result', async () => {
      renderWithState({ initialState: { columns: ['gone', 'b'] } });
      expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveTextContent('b');
    });

    it('falls back to the result columns when none of the restored columns remain', async () => {
      renderWithState({ initialState: { columns: ['gone'] } });
      expect(await screen.findByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b,c');
    });

    it('reports user changes through onStateChange', async () => {
      const onStateChange = jest.fn();
      renderWithState({ onStateChange });
      await screen.findByTestId('mockUnifiedDataTable');

      act(() => {
        const { onSetColumns, onResize, onUpdateRowHeight, onUpdateRowsPerPage } =
          getLatestTableProps();
        onSetColumns(['b']);
        onResize?.({ columnId: 'b', width: 200 });
        onUpdateRowHeight?.(2);
        onUpdateRowsPerPage?.(25);
      });

      expect(onStateChange).toHaveBeenLastCalledWith({
        columns: ['b'],
        columnWidths: { b: 200 },
        rowHeight: 2,
        rowsPerPage: 25,
      });
    });

    it('restores the page and horizontal scroll position through the table restorable state', async () => {
      renderWithState({ initialState: { pageIndex: 2, scrollLeft: 150, rowsPerPage: 25 } });
      await screen.findByTestId('mockUnifiedDataTable');

      expect(getLatestTableProps().initialState).toEqual({ pageIndex: 2, scrollLeft: 150 });
    });

    it('does not restore a page or scroll position that was never recorded', async () => {
      renderWithState({ initialState: { rowsPerPage: 25 } });
      await screen.findByTestId('mockUnifiedDataTable');

      expect(getLatestTableProps().initialState).toEqual({});
    });

    it('reports page and horizontal scroll changes merged with the rest of the state', async () => {
      const onStateChange = jest.fn();
      renderWithState({ initialState: { rowsPerPage: 25 }, onStateChange });
      await screen.findByTestId('mockUnifiedDataTable');

      act(() => {
        getLatestTableProps().onInitialStateChange?.({ pageIndex: 1, scrollLeft: 300 });
      });

      expect(onStateChange).toHaveBeenLastCalledWith({
        columns: ['a', 'b', 'c'],
        columnWidths: {},
        rowHeight: 5,
        rowsPerPage: 25,
        pageIndex: 1,
        scrollLeft: 300,
      });
    });

    it('forgets a column width when it is reset to auto', async () => {
      const onStateChange = jest.fn();
      renderWithState({ initialState: { columnWidths: { a: 120 } }, onStateChange });
      await screen.findByTestId('mockUnifiedDataTable');

      act(() => {
        getLatestTableProps().onResize?.({ columnId: 'a', width: undefined });
      });

      expect(onStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ columnWidths: {} }));
    });
  });
});
