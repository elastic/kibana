/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { EsqlSource } from '@kbn/data-source';
import DataGrid from './data_grid';

jest.mock('@kbn/unified-data-table', () => {
  const actual = jest.requireActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: (props: { columns: string[]; dataSource?: EsqlSource }) => (
      <div
        data-test-subj="mockUnifiedDataTable"
        data-source-query={props.dataSource?.query}
        data-source-columns={props.dataSource
          ?.getColumns()
          .map(({ name }) => name)
          .join(',')}
      >
        {props.columns.join(',')}
      </div>
    ),
  };
});

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
});
