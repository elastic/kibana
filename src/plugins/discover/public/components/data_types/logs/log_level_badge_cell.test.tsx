/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildDataTableRecord, DataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { getLogLevelBadgeCell } from './log_level_badge_cell';

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
  it('renders badge with color based on provided logLevelField', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'info' } }, dataViewMock);
    renderCell('log.level', record);
    const badge = screen.getByTestId('logLevelBadgeCell-info');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('info');
    expect(getComputedStyle(badge).getPropertyValue('--euiBadgeBackgroundColor')).toEqual(
      '#90b0d1'
    );
  });

  it('renders unknown badge if logLevelField is not recognized', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'unknown_level' } }, dataViewMock);
    renderCell('log.level', record);
    const badge = screen.getByTestId('logLevelBadgeCell-unknown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('unknown_level');
    expect(getComputedStyle(badge).getPropertyValue('--euiBadgeBackgroundColor')).toEqual('');
  });

  it('renders empty if no matching logLevelField is found', () => {
    const record = buildDataTableRecord({ fields: { 'log.level': 'info' } }, dataViewMock);
    renderCell('log_level', record);
    const badge = screen.getByTestId('logLevelBadgeCell-empty');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('-');
  });
});
