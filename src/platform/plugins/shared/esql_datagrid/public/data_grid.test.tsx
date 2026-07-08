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
import DataGrid from './data_grid';

jest.mock('@kbn/unified-data-table', () => {
  const actual = jest.requireActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: (props: { columns: string[] }) => (
      <div data-test-subj="mockUnifiedDataTable">{props.columns.join(',')}</div>
    ),
  };
});

describe('DataGrid', () => {
  const data = dataPluginMock.createStartContract();
  const dataView = { toSpec: jest.fn() } as unknown as DataView;
  const core = coreMock.createStart();
  const fieldFormats = fieldFormatsServiceMock.createStartContract();
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
        fieldFormats={fieldFormats}
        rows={[]}
        dataView={dataView}
        query={query}
        isTableView
        columns={columns}
        isApproximate={false}
      />
    );

  it('renders the columns passed in props', () => {
    renderGrid([column('a'), column('b')]);
    expect(screen.getByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b');
  });

  it('updates the rendered columns when props.columns changes', () => {
    const { rerender } = renderGrid([column('a'), column('b')]);
    expect(screen.getByTestId('mockUnifiedDataTable')).toHaveTextContent('a,b');

    rerender(
      <DataGrid
        core={core}
        data={data}
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
  });

  it('keeps the previous column set when props.columns is re-created with the same names', () => {
    const initialColumns = [column('a'), column('b')];
    const { rerender } = renderGrid(initialColumns);

    rerender(
      <DataGrid
        core={core}
        data={data}
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
