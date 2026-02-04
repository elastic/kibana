/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metricStateSchema } from '../../schema/charts/metric';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  simpleMetricAttributes,
  breakdownMetricAttributes,
  complexMetricAttributes,
  breakdownMetricWithFormulaRefColumnsAttributes,
} from './lens_state_config.mock';
import {
  simpleMetricAPIAttributes,
  breakdownMetricAPIAttributes,
  complexMetricAPIAttributes,
  complexESQLMetricAPIAttributes,
  metricAPIWithTermsRankedBySecondary,
} from './lens_api_config.mock';

describe('Metric', () => {
  describe('validateConverter', () => {
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
  describe('validateAPIConverter', () => {
    it('should convert a simple metric', () => {
      validateAPIConverter(simpleMetricAPIAttributes, metricStateSchema);
    });

    it('should convert a complex metric', () => {
      validateAPIConverter(complexMetricAPIAttributes, metricStateSchema);
    });

    it('should convert a breakdown-by metric', () => {
      validateAPIConverter(breakdownMetricAPIAttributes, metricStateSchema);
    });

    it('should convert a complex ESQL metric chart', () => {
      validateAPIConverter(complexESQLMetricAPIAttributes, metricStateSchema);
    });

    it('should convert a metric with a terms agg ranked by secondary metric', () => {
      validateAPIConverter(metricAPIWithTermsRankedBySecondary, metricStateSchema);
    });
  });

  it('should convert a breakdown-by metric with formula reference columns and rank_by in the terms bucket operation', () => {
    validateConverter(breakdownMetricWithFormulaRefColumnsAttributes, metricStateSchema);
  });
});
