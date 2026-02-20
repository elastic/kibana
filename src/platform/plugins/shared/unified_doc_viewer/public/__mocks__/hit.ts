/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { fieldList } from '@kbn/data-views-plugin/common';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';

const buildDataViewMock = ({
  name = 'data-view-mock',
  fields: definedFields = [] as unknown as DataView['fields'],
  timeFieldName,
}: {
  name?: string;
  fields?: DataView['fields'];
  timeFieldName?: string;
}): DataView => {
  const dataViewFields = [...definedFields] as DataView['fields'];

  dataViewFields.getByName = (fieldName: string) => {
    return dataViewFields.find((field) => field.name === fieldName);
  };

  dataViewFields.getByType = (fieldType: string) => {
    return dataViewFields.filter((field) => field.type === fieldType);
  };

  dataViewFields.getAll = () => {
    return dataViewFields;
  };

  dataViewFields.create = (spec: FieldSpec) => {
    return new DataViewField(spec);
  };

  const id = `${name}-id`;
  const title = `${name}-title`;

  return {
    id,
    title,
    name,
    metaFields: ['_index', '_score'],
    fields: dataViewFields,
    type: 'default',
    getName: () => name,
    getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, runtimeFields: {} }),
    getSourceFiltering: () => ({}),
    getIndexPattern: () => title,
    getFieldByName: jest.fn((fieldName: string) => dataViewFields.getByName(fieldName)),
    timeFieldName,
    docvalueFields: [],
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    isTimeBased: () => !!timeFieldName,
    isTimeNanosBased: () => false,
    isPersisted: () => true,
    toSpec: () => ({ id, title, name }),
    toMinimalSpec: () => ({ id, title, name }),
    getTimeField: () => {
      return dataViewFields.find((field) => field.name === timeFieldName);
    },
    getScriptedField: () => {
      return dataViewFields.find((field) => field.name === timeFieldName);
    },
    getRuntimeField: () => null,
    getAllowHidden: () => false,
    isTSDBMode: () =>
      dataViewFields.some((field) => field.timeSeriesMetric || field.timeSeriesDimension),
    setFieldCount: jest.fn(),
  } as unknown as DataView;
};

const shallowMockedFields: FieldSpec[] = [
  {
    name: '_source',
    type: '_source',
    scripted: false,
    searchable: false,
    aggregatable: false,
  },
  {
    name: '_index',
    type: 'string',
    scripted: false,
    searchable: true,
    aggregatable: false,
  },
  {
    name: '@timestamp',
    type: 'date',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
];

const deepMockedFields = fieldList(shallowMockedFields);

export const buildHitMock = (
  fields: Record<string, unknown> = {},
  customIndex: string = 'index',
  dataView: DataView = buildDataViewMock({
    name: 'data-view-mock',
    fields: deepMockedFields,
  })
) =>
  buildDataTableRecord(
    {
      _index: customIndex,
      _id: customIndex,
      _score: 1,
      _source: {},
      fields,
    },
    dataView
  );
