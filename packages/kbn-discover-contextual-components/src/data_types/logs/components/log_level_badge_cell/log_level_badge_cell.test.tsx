/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { getLogLevelBadgeCell } from './log_level_badge_cell';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__/data_view';
import { DataTableRecord, buildDataTableRecord } from '@kbn/discover-utils';

const renderCell = (logLevelField: string, record: DataTableRecord) => {
  const LogLevelBadgeCell = getLogLevelBadgeCell(logLevelField);
  render(
    <LogLevelBadgeCell
      rowIndex={0}
      colIndex={0}
      columnId="log.level"
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

describe('getLogLevelBadgeCell', () => {
  it('renders badge if log level is recognized', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'info' } }, dataViewMock);
    renderCell('log.level', record);
    expect(screen.getByTestId('logLevelBadgeCell-info')).toBeInTheDocument();
  });

  it('renders unknown if log level is not recognized', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'unknown_level' } }, dataViewMock);
    renderCell('log.level', record);
    expect(screen.getByTestId('logLevelBadgeCell-unknown')).toBeInTheDocument();
  });

  it('renders empty if no matching log level field is found', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'info' } }, dataViewMock);
    renderCell('log_level', record);
    expect(screen.getByTestId('logLevelBadgeCell-empty')).toBeInTheDocument();
  });
});
