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
import { EuiProvider } from '@elastic/eui';
import React from 'react';
import { getLogLevelBadgeCell } from './log_level_badge_cell';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { fieldList } from '@kbn/data-views-plugin/common';

const dataViewMock: DataView = (() => {
  const shallowMockedFields: FieldSpec[] = [
    {
      name: '_source',
      type: '_source',
      scripted: false,
      searchable: false,
      aggregatable: false,
    },
    {
      name: 'log.level',
      type: 'string',
      scripted: false,
      searchable: true,
      aggregatable: true,
    },
  ];

  const fields = fieldList(shallowMockedFields);
  fields.create = (spec: FieldSpec) => new DataViewField(spec);
  fields.getByName = (fieldName: string) => fields.find((field) => field.name === fieldName);
  fields.getByType = (fieldType: string) => fields.filter((field) => field.type === fieldType);
  fields.getAll = () => fields;

  return {
    id: 'the-data-view-id',
    title: 'the-data-view-title',
    name: 'the-data-view',
    type: 'default',
    metaFields: ['_index', '_score'],
    fields,
    getName: () => 'the-data-view',
    getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, runtimeFields: {} }),
    getSourceFiltering: () => ({}),
    getIndexPattern: () => 'the-data-view-title',
    getFieldByName: jest.fn((fieldName: string) => fields.getByName(fieldName)),
    timeFieldName: undefined,
    docvalueFields: [],
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    isTimeBased: () => false,
    isTimeNanosBased: () => false,
    isPersisted: () => true,
    toSpec: () => ({ id: 'the-data-view-id', title: 'the-data-view-title', name: 'the-data-view' }),
    toMinimalSpec: () => ({
      id: 'the-data-view-id',
      title: 'the-data-view-title',
      name: 'the-data-view',
    }),
    getTimeField: () => undefined,
    getScriptedField: () => undefined,
    getRuntimeField: () => null,
    getAllowHidden: () => false,
    isTSDBMode: () => false,
    setFieldCount: jest.fn(),
  } as unknown as DataView;
})();

const renderCell = (logLevelField: string, record: DataTableRecord) => {
  const LogLevelBadgeCell = getLogLevelBadgeCell(logLevelField);
  render(
    <EuiProvider highContrastMode={false}>
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
    </EuiProvider>
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
