/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { metricConfigSchema } from '../../schema/charts/metric';
import type { MetricConfig } from '../../schema/charts/metric';
import { AUTO_COLOR, NO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import { dynamicColorsMetricAttributes } from './dynamic_colors.mock';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  simpleMetricAttributes,
  breakdownMetricAttributes,
  complexMetricAttributes,
  breakdownMetricWithFormulaRefColumnsAttributes,
  selectorColorByValueAttributes,
  defaultColorByValueAttributes,
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
      validateConverter(simpleMetricAttributes, metricConfigSchema);
    });

    it('should convert a complex metric', () => {
      validateConverter(complexMetricAttributes, metricConfigSchema);
    });

    it('should convert a breakdown-by metric', () => {
      validateConverter(breakdownMetricAttributes, metricConfigSchema);
    });

    it('should convert a default color by value palette', () => {
      validateConverter(defaultColorByValueAttributes, metricConfigSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(selectorColorByValueAttributes, metricConfigSchema);
    });
  });
  describe('validateAPIConverter', () => {
    it('should convert a simple metric', () => {
      validateAPIConverter(simpleMetricAPIAttributes, metricConfigSchema);
    });

    it('should convert a complex metric', () => {
      validateAPIConverter(complexMetricAPIAttributes, metricConfigSchema);
    });

    it('should convert a breakdown-by metric', () => {
      validateAPIConverter(breakdownMetricAPIAttributes, metricConfigSchema);
    });

    it('should convert a complex ESQL metric chart', () => {
      validateAPIConverter(complexESQLMetricAPIAttributes, metricConfigSchema);
    });

    it('should convert a metric with a terms agg ranked by secondary metric', () => {
      validateAPIConverter(metricAPIWithTermsRankedBySecondary, metricConfigSchema);
    });
  });

  it('should convert a breakdown-by metric with formula reference columns and rank_by in the terms bucket operation', () => {
    validateConverter(breakdownMetricWithFormulaRefColumnsAttributes, metricConfigSchema);
  });

  it('should convert a dynamic colors metric', () => {
    validateConverter(dynamicColorsMetricAttributes, metricConfigSchema);
  });

  describe('color default application', () => {
    const baseMetric = {
      type: 'metric',
      title: 'Color default test',
      data_source: {
        type: AS_CODE_DATA_VIEW_SPEC_TYPE,
        index_pattern: 'test-index',
        time_field: '@timestamp',
      },
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          empty_as_null: false,
        },
      ],
      sampling: 1,
      ignore_global_filters: false,
    } satisfies MetricConfig;

    it('should emit AUTO_COLOR for primary metric when no color is specified', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseMetric);
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
    });

    it('should emit NO_COLOR for secondary metric when no color is specified', () => {
      const config = {
        ...baseMetric,
        metrics: [
          ...baseMetric.metrics,
          {
            type: 'secondary',
            operation: 'average',
            field: 'bytes',
          },
        ],
      } satisfies MetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as MetricConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
      expect(apiOutput.metrics[1].color).toEqual(NO_COLOR);
    });
  });
});
