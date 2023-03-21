/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/public';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { createColumn } from './column';
import { GeneralColumnWithMeta } from './types';

describe('createColumn', () => {
  const field = stubLogstashDataView.fields[0];
  const aggId = `some-id`;
  const customLabel = 'some-custom-label';
  const label = 'some label';
  const timeShift = '1h';

  const agg: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
    aggId,
    aggParams: {
      field: field.name,
    },
  };

  const aggWithCustomLabel: SchemaConfig<METRIC_TYPES.AVG> = {
    ...agg,
    aggParams: {
      field: field.name,
      customLabel,
    },
  };

  const aggWithTimeShift: SchemaConfig<METRIC_TYPES.AVG> = {
    ...agg,
    aggParams: {
      field: field.name,
      timeShift,
    },
  };

  const extraColumnFields = { isBucketed: true, isSplit: true, reducedTimeRange: '1m' };

  test.each<[string, Parameters<typeof createColumn>, Partial<GeneralColumnWithMeta>]>([
    [
      'with default params',
      [agg, field],
      {
        dataType: 'number',
        isBucketed: false,
        isSplit: false,
        label,
        meta: { aggId },
      },
    ],
    [
      'with custom label',
      [aggWithCustomLabel, field],
      {
        dataType: 'number',
        isBucketed: false,
        isSplit: false,
        label: customLabel,
        meta: { aggId },
      },
    ],
    [
      'with timeShift',
      [aggWithTimeShift, field],
      {
        dataType: 'number',
        isBucketed: false,
        isSplit: false,
        label,
        meta: { aggId },
        timeShift,
      },
    ],
    [
      'with extra column fields',
      [agg, field, extraColumnFields],
      {
        dataType: 'number',
        isBucketed: extraColumnFields.isBucketed,
        isSplit: extraColumnFields.isSplit,
        reducedTimeRange: extraColumnFields.reducedTimeRange,
        label,
        meta: { aggId },
      },
    ],
  ])('should create column by agg %s', (_, input, expected) => {
    expect(createColumn(...input)).toEqual(expect.objectContaining(expected));
  });
});
