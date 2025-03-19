/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { createSeries } from '../__mocks__';
import { FormulaColumn } from './types';
import { Metric } from '../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { convertVarianceToFormulaColumn } from './variance';

describe('convertVarianceToFormulaColumn', () => {
  const series = createSeries();
  const dataView = stubLogstashDataView;
  const metric: Metric = {
    id: 'some-id',
    type: TSVB_METRIC_TYPES.VARIANCE,
  };
  const field = dataView.fields[0].name;

  test.each<
    [string, Parameters<typeof convertVarianceToFormulaColumn>, Partial<FormulaColumn> | null]
  >([
    ['null if field is not provided', [{ series, metrics: [metric], dataView }], null],
    [
      'correct formula column',
      [{ series, metrics: [{ ...metric, field }], dataView }],
      {
        meta: { metricId: 'some-id' },
        operationType: 'formula',
        params: {
          formula: 'pow(standard_deviation(bytes), 2)',
        },
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertVarianceToFormulaColumn(...input)).toBeNull();
    } else {
      expect(convertVarianceToFormulaColumn(...input)).toEqual(expect.objectContaining(expected));
    }
  });
});
