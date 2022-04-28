/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isRangeFilter } from '@kbn/es-query';
import { BytesFormat, FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { AggConfigs, IAggConfig } from '../../aggs';
import { mockAggTypesRegistry } from '../../aggs/test_helpers';

import { createFilter } from './create_filter';
import { Datatable } from '@kbn/expressions-plugin/common';

describe('createFilter', () => {
  let table: Datatable;
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
      type: 'datatable',
      columns: [
        {
          id: '1-1',
          name: 'test',
          meta: { type: 'number' },
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
      expect(filters[0].query!.match_phrase!.bytes).toEqual('2048');
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
        expect(rangeFilter.query.range.bytes.gte).toEqual(2048);
        expect(rangeFilter.query.range.bytes.lt).toEqual(2078);
      }
    }
  });
});
