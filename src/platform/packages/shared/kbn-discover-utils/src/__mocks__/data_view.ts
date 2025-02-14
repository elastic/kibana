/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView, DataViewField, FieldSpec } from '@kbn/data-views-plugin/public';

export const shallowMockedFields = [
  {
    name: '_source',
    type: '_source',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: '_index',
    type: 'string',
    scripted: false,
    filterable: true,
    aggregatable: false,
  },
  {
    name: 'message',
    type: 'string',
    displayName: 'message',
    scripted: false,
    filterable: false,
    aggregatable: false,
  },
  {
    name: 'extension',
    type: 'string',
    displayName: 'extension',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: 'bytes',
    type: 'number',
    displayName: 'bytesDisplayName',
    scripted: false,
    filterable: true,
    aggregatable: true,
    sortable: true,
  },
  {
    name: 'scripted',
    type: 'number',
    displayName: 'scripted',
    scripted: true,
    filterable: false,
  },
  {
    name: 'object.value',
    type: 'number',
    displayName: 'object.value',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    displayName: '@timestamp',
    scripted: false,
    filterable: true,
    aggregatable: true,
  },
] as DataView['fields'];

export const deepMockedFields = shallowMockedFields.map(
  (field) => new DataViewField(field)
) as DataView['fields'];

export const buildDataViewMock = ({
  name,
  fields: definedFields,
  timeFieldName,
}: {
  name: string;
  fields: DataView['fields'];
  timeFieldName?: string;
}): DataView => {
  const dataViewFields = [...definedFields] as DataView['fields'];

  dataViewFields.getByName = (fieldName: string) => {
    return dataViewFields.find((field) => field.name === fieldName);
  };

  dataViewFields.getByType = (type: string) => {
    return dataViewFields.filter((field) => field.type === type);
  };

  dataViewFields.getAll = () => {
    return dataViewFields;
  };

  dataViewFields.create = (spec: FieldSpec) => {
    return new DataViewField(spec);
  };

  const dataView = {
    id: `${name}-id`,
    title: `${name}-title`,
    name,
    metaFields: ['_index', '_score'],
    fields: dataViewFields,
    type: 'default',
    getName: () => name,
    getComputedFields: () => ({ docvalueFields: [], scriptFields: {}, runtimeFields: {} }),
    getSourceFiltering: () => ({}),
    getIndexPattern: () => `${name}-title`,
    getFieldByName: jest.fn((fieldName: string) => dataViewFields.getByName(fieldName)),
    timeFieldName: timeFieldName || '',
    docvalueFields: [],
    getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    isTimeNanosBased: () => false,
    isPersisted: () => true,
    toSpec: () => ({}),
    toMinimalSpec: () => ({}),
    getTimeField: () => {
      return dataViewFields.find((field) => field.name === timeFieldName);
    },
    getScriptedField: () => {
      return dataViewFields.find((field) => field.name === timeFieldName);
    },
    getRuntimeField: () => null,
    getAllowHidden: () => false,
    setFieldCount: jest.fn(),
  } as unknown as DataView;

  dataView.isTimeBased = () => !!timeFieldName;

  return dataView;
};

export const dataViewMock = buildDataViewMock({
  name: 'the-data-view',
  fields: shallowMockedFields,
});

export const dataViewMockWithTimeField = buildDataViewMock({
  name: 'the-data-view',
  fields: shallowMockedFields,
  timeFieldName: '@timestamp',
});
