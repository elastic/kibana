/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Operations } from '@kbn/visualizations-plugin/common';
import { Column } from '../convert';
import { getValidColumns } from './columns';

describe('getValidColumns', () => {
  const dataView = stubLogstashDataView;
  const columns: Column[] = [
    {
      operationType: Operations.AVERAGE,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-0',
      dataType: 'number',
      params: {},
      meta: { metricId: 'metric-0' },
      isSplit: false,
      isBucketed: true,
    },
    {
      operationType: Operations.SUM,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-1',
      dataType: 'number',
      params: {},
      meta: { metricId: 'metric-1' },
      isSplit: false,
      isBucketed: true,
    },
  ];
  test.each<[string, Parameters<typeof getValidColumns>, Column[] | null]>([
    ['null if array contains null', [[null, ...columns]], null],
    ['null if columns is null', [null], null],
    ['null if columns is undefined', [undefined], null],
    ['columns', [columns], columns],
    ['columns if one column is passed', [columns[0]], [columns[0]]],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getValidColumns(...input)).toBeNull();
    } else {
      expect(getValidColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
