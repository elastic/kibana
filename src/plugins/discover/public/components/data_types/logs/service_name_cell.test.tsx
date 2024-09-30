/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord, DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { getServiceNameCell } from './service_name_cell';

const renderCell = (serviceNameField: string, record: DataTableRecord) => {
  const ServiceNameCell = getServiceNameCell(serviceNameField);
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
    expect(screen.getByTestId('serviceNameCell-nodejs')).toBeInTheDocument();
  });

  it('renders default icon with unknwon test subject if agent name is missing', () => {
    const record = buildDataTableRecord(
      { fields: { 'service.name': 'test-service' } },
      dataViewMock
    );
    renderCell('service.name', record);
    expect(screen.getByTestId('serviceNameCell-unknown')).toBeInTheDocument();
  });

  it('does not render if service name is missing', () => {
    const record = buildDataTableRecord({ fields: { 'agent.name': 'nodejs' } }, dataViewMock);
    renderCell('service.name', record);
    expect(screen.queryByTestId('serviceNameCell-nodejs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceNameCell-unknown')).not.toBeInTheDocument();
  });
});
