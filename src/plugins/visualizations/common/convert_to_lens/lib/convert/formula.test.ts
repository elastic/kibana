/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { SchemaConfig } from '../../..';
import { createFormulaColumn } from './formula';

describe('createFormulaColumn', () => {
  const aggId = `some-id`;
  const label = 'some label';
  const agg: SchemaConfig<METRIC_TYPES.CUMULATIVE_SUM> = {
    accessor: 0,
    label,
    format: {
      id: undefined,
      params: undefined,
    },
    params: {},
    aggType: METRIC_TYPES.CUMULATIVE_SUM,
    aggId,
    aggParams: {
      customMetric: {
        id: 'some-id-metric',
        enabled: true,
        type: { name: METRIC_TYPES.AVG },
        params: {
          field: stubLogstashDataView.fields[0],
        },
      } as IAggConfig,
    },
  };
  test('should return formula column', () => {
    expect(createFormulaColumn('test-formula', agg)).toEqual(
      expect.objectContaining({
        isBucketed: false,
        isSplit: false,
        meta: {
          aggId,
        },
        operationType: 'formula',
        params: {
          formula: 'test-formula',
        },
        references: [],
      })
    );
  });
});
