/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isRangeFilter } from '../../../es_query/filters';
import { BytesFormat, FieldFormatsGetConfigFn } from '../../../field_formats';
import { AggConfigs, IAggConfig } from '../../aggs';
import { mockAggTypesRegistry } from '../../aggs/test_helpers';
import { TabbedTable } from '../../tabify';

import { createFilter } from './create_filter';

describe('createFilter', () => {
  let table: TabbedTable;
  let aggConfig: IAggConfig;

  const typesRegistry = mockAggTypesRegistry();

  const getAggConfigs = (type: string, params: any) => {
    const field = {
      name: 'bytes',
      filterable: true,
      indexPattern: {
        id: '1234',
      },
      format: new BytesFormat({}, (() => {}) as FieldFormatsGetConfigFn),
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
      getFormatterForField: () => new BytesFormat({}, (() => {}) as FieldFormatsGetConfigFn),
    } as any;

    return new AggConfigs(
      indexPattern,
      [
        {
          id: type,
          type,
          schema: 'buckets',
          params,
        },
      ],
      { typesRegistry }
    );
  };

  const aggConfigParams: Record<string, any> = {
    field: 'bytes',
    interval: 30,
    otherBucket: true,
  };

  beforeEach(() => {
    table = {
      columns: [
        {
          id: '1-1',
          name: 'test',
          aggConfig,
        },
      ],
      rows: [
        {
          '1-1': '2048',
        },
      ],
    };
  });

  test('ignores event when cell value is not provided', async () => {
    aggConfig = getAggConfigs('histogram', aggConfigParams).aggs[0];
    const filters = await createFilter([aggConfig], table, 0, -1, null);

    expect(filters).not.toBeDefined();
  });

  test('handles an event when aggregations type is a terms', async () => {
    aggConfig = getAggConfigs('terms', aggConfigParams).aggs[0];
    const filters = await createFilter([aggConfig], table, 0, 0, 'test');

    expect(filters).toBeDefined();

    if (filters) {
      expect(filters.length).toEqual(1);
      expect(filters[0].query.match_phrase.bytes).toEqual('2048');
    }
  });

  test('handles an event when aggregations type is not terms', async () => {
    aggConfig = getAggConfigs('histogram', aggConfigParams).aggs[0];
    const filters = await createFilter([aggConfig], table, 0, 0, 'test');

    expect(filters).toBeDefined();

    if (filters) {
      expect(filters.length).toEqual(1);

      const [rangeFilter] = filters;

      if (isRangeFilter(rangeFilter)) {
        expect(rangeFilter.range.bytes.gte).toEqual(2048);
        expect(rangeFilter.range.bytes.lt).toEqual(2078);
      }
    }
  });
});
