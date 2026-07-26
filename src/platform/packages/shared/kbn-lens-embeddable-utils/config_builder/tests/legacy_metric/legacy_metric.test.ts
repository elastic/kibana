/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import type { LegacyMetricConfig } from '../../schema';
import { AUTO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import {
  customColorByValueAttributes,
  defaultColorByValueAttributes,
  selectorColorByValueAttributes,
  simpleLegacyMetricAttributes,
} from './lens_state_config.mock';
import {
  basicLegacyMetricWithAdHocDataView,
  basicLegacyMetricWithDataView,
  esqlLegacyMetric,
  comprehensiveLegacyMetricWithAdHocDataView,
  comprehensiveLegacyMetricWithDataView,
  comprehensiveEsqlLegacyMetric,
  legacyMetricWithApplyColorToWithoutColor,
  legacyMetricWithColorWithoutApplyColorTo,
} from './lens_api_config.mock';
import { validator } from '../utils/validator';

describe('Legacy Metric', () => {
  describe('state transform validation', () => {
    it('should convert a simple legacy metric', () => {
      validator.legacy_metric.fromState(simpleLegacyMetricAttributes);
    });

    it('should convert a default color by value palette', () => {
      validator.legacy_metric.fromState(defaultColorByValueAttributes);
    });

    it('should convert a selector color by value palette', () => {
      validator.legacy_metric.fromState(selectorColorByValueAttributes);
    });

    it('should convert a custom metric with a color by value palette', () => {
      validator.legacy_metric.fromState(customColorByValueAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert abasic legacy metric chart with ad hoc dataView', () => {
      validator.legacy_metric.fromApi(basicLegacyMetricWithAdHocDataView);
    });

    it('should convert a basic legacy metric chart with dataView', () => {
      validator.legacy_metric.fromApi(basicLegacyMetricWithDataView);
    });

    it('should reject a ESQL-based legacy metric chart', () => {
      expect(() =>
        validator.legacy_metric.fromApi(esqlLegacyMetric as unknown as LegacyMetricConfig)
      ).toThrow();
    });

    it('should convert a comprehensive legacy metric chart with ad hoc data view', () => {
      validator.legacy_metric.fromApi(comprehensiveLegacyMetricWithAdHocDataView);
    });

    it('should convert a comprehensive legacy metric chart with data view', () => {
      validator.legacy_metric.fromApi(comprehensiveLegacyMetricWithDataView);
    });

    it('should reject a comprehensive ESQL-based legacy metric chart', () => {
      expect(() =>
        validator.legacy_metric.fromApi(
          comprehensiveEsqlLegacyMetric as unknown as LegacyMetricConfig
        )
      ).toThrow();
    });

    it('should convert a legacy metric chart with apply_color_to, but without color', () => {
      validator.legacy_metric.fromApi(legacyMetricWithApplyColorToWithoutColor, [
        'metric.apply_color_to',
      ]);
    });

    it('should convert a legacy metric chart with color, but without apply_color_to', () => {
      validator.legacy_metric.fromApi(legacyMetricWithColorWithoutApplyColorTo, ['metric.color']);
    });
  });

  describe('color default application', () => {
    it('should emit AUTO_COLOR when apply_color_to is set without color', () => {
      const config = {
        type: 'legacy_metric',
        title: 'Color default test',
        data_source: {
          type: AS_CODE_DATA_VIEW_SPEC_TYPE,
          index_pattern: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          empty_as_null: false,
          apply_color_to: 'background',
        },
        sampling: 1,
        ignore_global_filters: false,
      } satisfies LegacyMetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as LegacyMetricConfig;

      expect(apiOutput.metric.color).toEqual(AUTO_COLOR);
      expect(apiOutput.metric.apply_color_to).toBe('background');
    });

    it('should omit color when apply_color_to is not specified', () => {
      const config = {
        type: 'legacy_metric',
        title: 'Color default test',
        data_source: {
          type: AS_CODE_DATA_VIEW_SPEC_TYPE,
          index_pattern: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          empty_as_null: false,
        },
        sampling: 1,
        ignore_global_filters: false,
      } satisfies LegacyMetricConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as LegacyMetricConfig;

      expect(apiOutput.metric.color).not.toBeDefined();
      expect(apiOutput.metric.apply_color_to).not.toBeDefined();
    });
  });
});
