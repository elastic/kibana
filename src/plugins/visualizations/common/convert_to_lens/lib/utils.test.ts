/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../types';
import { getLabel } from './utils';

describe('getLabel', () => {
  const label = 'some label';
  const customLabel = 'some custom label';

  const agg: SchemaConfig<METRIC_TYPES.AVG> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.AVG,
    aggId: 'id',
    aggParams: { field: 'some-field' },
  };

  test('should return label', () => {
    const { aggParams, ...aggWithoutAggParams } = agg;
    expect(getLabel(aggWithoutAggParams)).toEqual(label);
    expect(getLabel(agg)).toEqual(label);
    expect(getLabel({ ...agg, aggParams: { ...aggParams!, customLabel: undefined } })).toEqual(
      label
    );
  });

  test('should return customLabel', () => {
    const aggParams = { ...agg.aggParams!, customLabel };
    const aggWithCustomLabel = { ...agg, aggParams };
    expect(getLabel(aggWithCustomLabel)).toEqual(customLabel);
  });
});
