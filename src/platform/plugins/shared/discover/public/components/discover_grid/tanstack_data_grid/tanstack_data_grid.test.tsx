/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { dataViewMock, dataViewMockWithTimeField, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { TanStackDataGrid } from './tanstack_data_grid';
import { createDiscoverServicesMock } from '../../../__mocks__/services';

const services = createDiscoverServicesMock();
import { DiscoverTestProvider } from '../../../__mocks__/test_provider';

const rows = esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock));
const [expandedDoc] = rows;

const renderGrid = (
  override: Partial<React.ComponentProps<typeof TanStackDataGrid>> = {}
) => {
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
});

describe('TanStackDataGrid summary column row height', () => {
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
