/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldList } from '@kbn/data-views-plugin/common';
import type { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/public';

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
    name: 'message',
    type: 'string',
    scripted: false,
    searchable: false,
    aggregatable: false,
  },
  {
    name: 'extension',
    type: 'string',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    customLabel: 'bytesDisplayName',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    scripted: true,
    searchable: false,
    aggregatable: false,
  },
  {
    name: 'object.value',
    type: 'number',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    scripted: false,
    searchable: true,
    aggregatable: true,
  },
];

export const deepMockedFields = fieldList(shallowMockedFields);

export const buildDataViewMock = ({
  id,
  title,
  name = 'data-view-mock',
  type = 'default',
  fields: definedFields = [] as unknown as DataView['fields'],
  timeFieldName,
  isPersisted = true,
}: {
  id?: string;
  title?: string;
  name?: string;
  type?: string;
  fields?: DataView['fields'];
  timeFieldName?: string;
  isPersisted?: boolean;
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

  id = id ?? `${name}-id`;
  title = title ?? `${name}-title`;

  const dataView = {
    id,
    title,
    name,
    metaFields: ['_index', '_score'],
    fields: dataViewFields,
    type,
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
    isPersisted: () => isPersisted,
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

  return dataView;
};

export const dataViewMock = buildDataViewMock({
  name: 'the-data-view',
  fields: deepMockedFields,
});

export const dataViewMockWithTimeField = buildDataViewMock({
  name: 'the-data-view',
  fields: deepMockedFields,
  timeFieldName: '@timestamp',
});
