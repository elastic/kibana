/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import { getInitialESQLQuery } from './get_initial_esql_query';

const getDataView = (name: string, timeFieldName?: string) => {
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
  return {
    id: `${name}-id`,
    title: name,
    metaFields: ['_index', '_score'],
    fields,
    type: 'default',
    getName: () => name,
    getIndexPattern: () => name,
    getFieldByName: jest.fn((fieldName: string) => fields.getByName(fieldName)),
    timeFieldName,
    isPersisted: () => true,
    toSpec: () => ({}),
    toMinimalSpec: () => ({}),
  } as unknown as DataView;
};

describe('getInitialESQLQuery', () => {
  it('should NOT add the where clause if there is @timestamp in the dataview', () => {
    const dataView = getDataView('logs*', '@timestamp');
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | LIMIT 10');
  });

  it('should append a where clause correctly if the dataview timeFieldName is different than @timestamp', () => {
    const dataView = getDataView('logs*', '@custom_timestamp');
    expect(getInitialESQLQuery(dataView)).toBe(
      'FROM logs* | WHERE @custom_timestamp >= ?start AND @custom_timestamp <= ?end | LIMIT 10'
    );
  });
});
