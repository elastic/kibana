/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric } from '../../../../common/types';
import { getFilterRatioFormula } from './filter_ratio_formula';

describe('getFilterRatioFormula', () => {
  test('should return correct formula for filter ratio', () => {
    const metric = {
      id: '12345',
      type: 'filter_ratio',
      field: 'day_of_week_i',
      numerator: {
        query: 'category.keyword : "Men\'s Clothing" ',
        language: 'kuery',
      },
      denominator: {
        query: 'customer_gender : "FEMALE" ',
        language: 'kuery',
      },
    } as Metric;
    const formula = getFilterRatioFormula(metric);
    expect(formula).toStrictEqual(
      "count(kql='category.keyword : \"Men\\'s Clothing\" ') / count(kql='customer_gender : \"FEMALE\" ')"
    );
  });

  test('should return correct formula for positive rate', () => {
    const metric = {
      id: '12345',
      type: 'filter_ratio',
      field: 'day_of_week_i',
      numerator: {
        query: 'category.keyword : "Men\'s Clothing" ',
        language: 'kuery',
      },
      denominator: {
        query: 'customer_gender : "FEMALE" ',
        language: 'kuery',
      },
      metric_agg: 'positive_rate',
    } as Metric;
    const formula = getFilterRatioFormula(metric);
    expect(formula).toStrictEqual(
      "counter_rate(max('day_of_week_i',kql='category.keyword : \"Men\\'s Clothing\" ')) / counter_rate(max('day_of_week_i',kql='customer_gender : \"FEMALE\" '))"
    );
  });
});
