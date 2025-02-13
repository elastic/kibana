/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { buildDataTableRecord, DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import { DataGridDensity } from '@kbn/unified-data-table';
import { getServiceNameCell } from './service_name_cell';
import { CellRenderersExtensionParams } from '../../../context_awareness';

const core = {
  application: {
    capabilities: {
      apm: {
        show: true,
      },
    },
  },
  uiSettings: {
    get: () => true,
  },
};

jest.mock('../../../hooks/use_discover_services', () => {
  const originalModule = jest.requireActual('../../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => ({ core, share: {} }),
  };
});

const renderCell = (serviceNameField: string, record: DataTableRecord) => {
  const cellRenderersExtensionParamsMock: CellRenderersExtensionParams = {
    actions: {
      addFilter: jest.fn(),
    },
    dataView: dataViewMock,
    density: DataGridDensity.COMPACT,
    rowHeight: 1,
  };
  const ServiceNameCell = getServiceNameCell(serviceNameField, cellRenderersExtensionParamsMock);
  render(
    <ServiceNameCell
      rowIndex={0}
      colIndex={0}
      columnId="service.name"
      isExpandable={false}
      isExpanded={false}
      isDetails={false}
      row={record}
      dataView={dataViewMock}
      fieldFormats={fieldFormatsMock}
      setCellProps={() => {}}
      closePopover={() => {}}
    />
  );
};

describe('getServiceNameCell', () => {
  it('renders icon if agent name is recognized', () => {
    const record = buildDataTableRecord(
      { fields: { 'service.name': 'test-service', 'agent.name': 'nodejs' } },
      dataViewMock
    );
    renderCell('service.name', record);
    expect(screen.getByTestId('dataTableCellActionsPopover_service.name')).toBeInTheDocument();
  });

  it('does render empty div if service name is missing', () => {
    const record = buildDataTableRecord({ fields: { 'agent.name': 'nodejs' } }, dataViewMock);
    renderCell('service.name', record);
    expect(screen.queryByTestId('serviceNameCell-empty')).toBeInTheDocument();
  });
});
