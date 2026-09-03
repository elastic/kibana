/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
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
    isTSDBMode: jest.fn(() =>
      dataViewFields.some((field) => field.timeSeriesMetric || field.timeSeriesDimension)
    ),
  } as unknown as DataView;
};

const getTSDBFields = () =>
  [
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
      name: 'system.cpu.usage',
      displayName: 'system.cpu.usage',
      type: 'number',
      timeSeriesMetric: 'gauge',
      scripted: false,
      filterable: false,
    },
  ] as DataView['fields'];

describe('getInitialESQLQuery', () => {
  it('should add SORT by timeFieldName when @timestamp exists in the index', () => {
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
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | SORT @timestamp DESC');
  });

  it('should add SORT by timeFieldName when @timestamp exists even if timeFieldName differs', () => {
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
    expect(getInitialESQLQuery(dataView)).toBe('FROM logs* | SORT timestamp DESC');
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
      'FROM logs* | SORT @custom_timestamp DESC | WHERE @custom_timestamp >= ?_tstart AND @custom_timestamp <= ?_tend'
    );
  });

  it('should append a where clause correctly if there is no @timestamp in the index fields and a query is given', () => {
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
    expect(getInitialESQLQuery(dataView, { language: 'kuery', query: 'error' })).toBe(
      'FROM logs* | SORT @custom_timestamp DESC | WHERE @custom_timestamp >= ?_tstart AND @custom_timestamp <= ?_tend AND KQL("""error""")'
    );
  });

  it('should append a where clause correctly if there is @timestamp in the index fields and a query is given', () => {
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
    expect(getInitialESQLQuery(dataView, { language: 'lucene', query: 'error' })).toBe(
      'FROM logs* | SORT timestamp DESC | WHERE QSTR("""error""")'
    );
  });

  it('should not append a where clause correctly if there is @timestamp in the index fields and no kql or lucene query is given', () => {
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
    expect(getInitialESQLQuery(dataView, { language: 'unknown', query: 'error' })).toBe(
      'FROM logs* | SORT timestamp DESC'
    );
  });

  it('should append DSL filters as WHERE clause', () => {
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
    ] as DataView['fields'];
    const dataView = getDataView('logs*', fields, '@timestamp');
    const filters: Filter[] = [
      { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
    ];
    expect(getInitialESQLQuery(dataView, undefined, filters)).toBe(
      'FROM logs* | SORT @timestamp DESC | WHERE `status` : 200'
    );
  });

  it('should combine DSL filters with time filter and query', () => {
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
    ] as DataView['fields'];
    const dataView = getDataView('logs*', fields, '@custom_timestamp');
    const filters: Filter[] = [
      { meta: { key: 'status' }, query: { match_phrase: { status: 200 } } },
    ];
    expect(getInitialESQLQuery(dataView, { language: 'kuery', query: 'error' }, filters)).toBe(
      'FROM logs* | SORT @custom_timestamp DESC | WHERE @custom_timestamp >= ?_tstart AND @custom_timestamp <= ?_tend AND KQL("""error""") AND `status` : 200'
    );
  });

  it('should not add filters when array is empty', () => {
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
    ] as DataView['fields'];
    const dataView = getDataView('logs*', fields, '@timestamp');
    expect(getInitialESQLQuery(dataView, undefined, [])).toBe('FROM logs* | SORT @timestamp DESC');
  });

  it('should use TS command when dataView is in TSDB mode', () => {
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
        name: 'system.cpu.usage',
        displayName: 'system.cpu.usage',
        type: 'number',
        timeSeriesMetric: 'gauge',
        scripted: false,
        filterable: false,
      },
    ] as DataView['fields'];
    const dataView = getDataView('metrics-*', fields, '@timestamp');

    expect(getInitialESQLQuery(dataView)).toBe('TS metrics-* | SORT @timestamp DESC');
  });

  it('should use FROM command when the index pattern is *:* even in TSDB mode', () => {
    const dataView = getDataView('*:*', getTSDBFields(), '@timestamp');

    expect(getInitialESQLQuery(dataView)).toBe('FROM *:* | SORT @timestamp DESC');
  });

  it('should use FROM command when *:* is one of several index patterns', () => {
    const dataView = getDataView(
      '*:*,.alerts-security.alerts-default,apm-*-transaction*',
      getTSDBFields(),
      '@timestamp'
    );

    expect(getInitialESQLQuery(dataView)).toBe(
      'FROM *:*,.alerts-security.alerts-default,apm-*-transaction* | SORT @timestamp DESC'
    );
  });

  it('should use FROM command when a whitespace padded *:* appears in a non-leading position', () => {
    const dataView = getDataView('logs-*, *:* ,metrics-*', getTSDBFields(), '@timestamp');

    expect(getInitialESQLQuery(dataView)).toBe(
      'FROM logs-*, *:* ,metrics-* | SORT @timestamp DESC'
    );
  });

  it('should still use TS command for a targeted cross-cluster pattern in TSDB mode', () => {
    const dataView = getDataView('remote-cluster:metrics-*', getTSDBFields(), '@timestamp');

    expect(getInitialESQLQuery(dataView)).toBe(
      'TS remote-cluster:metrics-* | SORT @timestamp DESC'
    );
  });

  it('should still use TS command for a wildcard cluster with a targeted index in TSDB mode', () => {
    const dataView = getDataView('*:metrics-*', getTSDBFields(), '@timestamp');

    expect(getInitialESQLQuery(dataView)).toBe('TS *:metrics-* | SORT @timestamp DESC');
  });
});
