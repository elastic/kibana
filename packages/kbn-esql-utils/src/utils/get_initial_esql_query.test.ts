/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import { getInitialESQLQuery } from './get_initial_esql_query';

const getDataView = (name: string, dataViewFields: DataView['fields'], timeFieldName?: string) => {
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
    timeFieldName,
    isPersisted: () => true,
    toSpec: () => ({}),
    toMinimalSpec: () => ({}),
  } as unknown as DataView;
};

describe('getInitialESQLQuery', () => {
  it('should NOT add the where clause if there is @timestamp in the index', () => {
    const fields = [
      {
        name: '@timestamp',
        displayName: '@timestamp',
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
    const dataView = getDataView('logs*', fields, '@timestamp');
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | LIMIT 10');
  });

  it('should NOT add the where clause if there is @timestamp in the index although the dataview timefielName is different', () => {
    const fields = [
      {
        name: '@timestamp',
        displayName: '@timestamp',
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
    const dataView = getDataView('logs*', fields, 'timestamp');
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | LIMIT 10');
  });

  it('should append a where clause correctly if there is no @timestamp in the index fields', () => {
    const fields = [
      {
        name: '@custom_timestamp',
        displayName: '@custom_timestamp',
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
    const dataView = getDataView('logs*', fields, '@custom_timestamp');
    expect(getInitialESQLQuery(dataView)).toBe(
      'FROM logs* | WHERE @custom_timestamp >= ?t_start AND @custom_timestamp <= ?t_end | LIMIT 10'
    );
  });
});
