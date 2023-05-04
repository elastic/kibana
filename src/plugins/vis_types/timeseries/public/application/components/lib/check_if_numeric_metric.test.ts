/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { checkIfNumericMetric } from './check_if_numeric_metric';

import type { Metric } from '../../../../common/types';
import type { VisFields } from '../../lib/fetch_fields';

describe('checkIfNumericMetric(metric, fields, indexPattern)', () => {
  const indexPattern = { id: 'some_id' };
  const fields = {
    some_id: [
      { name: 'number field', type: 'number' },
      { name: 'string field', type: 'string' },
      { name: 'date field', type: 'date' },
    ],
  } as VisFields;

  it('should return true for Count metric', () => {
    const metric = { type: METRIC_TYPES.COUNT } as Metric;

    const actual = checkIfNumericMetric(metric, fields, indexPattern);
    expect(actual).toBe(true);
  });

  it('should return true for Average metric', () => {
    const metric = { field: 'number field', type: METRIC_TYPES.AVG } as Metric;

    const actual = checkIfNumericMetric(metric, fields, indexPattern);
    expect(actual).toBe(true);
  });

  it('should return true for Top Hit metric with numeric field', () => {
    const metric = { field: 'number field', type: TSVB_METRIC_TYPES.TOP_HIT } as Metric;

    const actual = checkIfNumericMetric(metric, fields, indexPattern);
    expect(actual).toBe(true);
  });

  it('should return false for Top Hit metric with string field', () => {
    const metric = { field: 'string field', type: TSVB_METRIC_TYPES.TOP_HIT } as Metric;

    const actual = checkIfNumericMetric(metric, fields, indexPattern);
    expect(actual).toBe(false);
  });

  it('should return false for Top Hit metric with date field', () => {
    const metric = { field: 'date field', type: TSVB_METRIC_TYPES.TOP_HIT } as Metric;

    const actual = checkIfNumericMetric(metric, fields, indexPattern);
    expect(actual).toBe(false);
  });
});
