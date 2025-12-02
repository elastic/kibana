/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metricStateSchema } from '../../schema/charts/metric';
import { validateConverter } from '../validate';
import { simpleMetricAttributes } from './simple.mock';
import { breakdownMetricAttributes } from './breakdown.mock';
import { complexMetricAttributes } from './complex.mock';

describe('Metric', () => {
  it('should convert a simple metric', () => {
    validateConverter(simpleMetricAttributes, metricStateSchema);
  });

  it('should convert a complex metric', () => {
    validateConverter(complexMetricAttributes, metricStateSchema);
  });

  it('should convert a breakdown-by metric', () => {
    validateConverter(breakdownMetricAttributes, metricStateSchema);
  });
});
