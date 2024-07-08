/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { getInitialESQLQuery } from './get_initial_esql_query';

const getDataView = (name: string, dataViewFields: DataView['fields']) => {
  dataViewFields.getByName = (fieldName: string) => {
    return dataViewFields.find((field) => field.name === fieldName);
  };

  return {
    id: `${name}-id`,
    title: name,
    metaFields: ['_index', '_score'],
    fields: dataViewFields,
    type: 'default',
    getName: () => name,
    getIndexPattern: () => name,
    getFieldByName: jest.fn((fieldName: string) => dataViewFields.getByName(fieldName)),
    timeFieldName: undefined,
    isPersisted: () => true,
    toSpec: () => ({}),
    toMinimalSpec: () => ({}),
  } as unknown as DataView;
};

describe('getInitialESQLQuery', () => {
  const fields = [
    {
      name: 'timestamp',
      displayName: 'timestamp',
      type: 'date',
      scripted: false,
      filterable: true,
      aggregatable: true,
      sortable: true,
    },
    {
      name: 'message',
      displayName: 'message',
      type: 'string',
      scripted: false,
      filterable: false,
    },
  ] as DataView['fields'];
  it('should NOT sort if there is no @timestamp in the index', () => {
    const dataView = getDataView('logs*', fields);
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | LIMIT 10');
  });

  it('should append a sort by @timestamp correctly if it exists in the index', () => {
    fields.push({
      name: '@timestamp',
      displayName: '@timestamp',
      type: 'date',
      scripted: false,
      filterable: true,
      aggregatable: true,
      sortable: true,
    } as DataViewField);
    const dataView = getDataView('logs*', fields);
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | SORT @timestamp DESC | LIMIT 10');
  });
});
