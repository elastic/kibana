/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, renderHook, screen } from '@testing-library/react';
import { useCustomCellRenderers } from './use_custom_cell_renderers';
import React from 'react';
import { buildDataViewMock, generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';

const renderHookWrapper = async () => {
  const services = createDiscoverServicesMock();
  await services.profilesManager.resolveRootProfile({});
  await services.profilesManager.resolveDataSourceProfile({});
  const dataView = buildDataViewMock({});
  const hit = generateEsHits(dataView, 1)[0];
  const record = services.profilesManager.resolveDocumentProfile({
    record: buildDataTableRecord(hit, dataView),
  });
  const hook = renderHook(
    () =>
      useCustomCellRenderers({
        actions: {
          addFilter: jest.fn(),
        },
        dataView,
        density: undefined,
        rowHeight: undefined,
      }),
    {
      wrapper: ({ children }) => (
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      ),
    }
  );
  const getCellProps = (
    props: Pick<DataGridCellValueElementProps, 'columnId'>
  ): DataGridCellValueElementProps => ({
    row: record,
    dataView,
    fieldFormats: services.fieldFormats,
    colIndex: 0,
    rowIndex: 0,
    isExpandable: false,
    isExpanded: false,
    isDetails: false,
    setCellProps: jest.fn(),
    closePopover: jest.fn(),
    ...props,
  });
  return { hook, getCellProps };
};

describe('useCustomCellRenderers', () => {
  it('should render root profile cell renderer', async () => {
    const { hook, getCellProps } = await renderHookWrapper();
    const cellProps = getCellProps({ columnId: 'rootProfile' });
    const CellRenderer = hook.result.current(cellProps)!;
    render(<CellRenderer {...cellProps} />);
    expect(screen.getByText('root-profile')).toBeInTheDocument();
  });

  it('should render data source profile cell renderer', async () => {
    const { hook, getCellProps } = await renderHookWrapper();
    const cellProps = getCellProps({ columnId: 'dataSourceProfile' });
    const CellRenderer = hook.result.current(cellProps)!;
    render(<CellRenderer {...cellProps} />);
    expect(screen.getByText('data-source-profile')).toBeInTheDocument();
  });

  it('should render document profile cell renderer', async () => {
    const { hook, getCellProps } = await renderHookWrapper();
    const cellProps = getCellProps({ columnId: 'documentProfile' });
    const CellRenderer = hook.result.current(cellProps)!;
    render(<CellRenderer {...cellProps} />);
    expect(screen.getByText('document-profile')).toBeInTheDocument();
  });
});
