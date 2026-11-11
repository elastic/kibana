/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import { validator } from '../utils/validator';
import { gaugeConfigSchema, type GaugeConfig } from '../../schema/charts/gauge';
import { AUTO_COLOR, NO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import {
  basicGaugeWithAdHocDataView,
  basicGaugeWithDataView,
  comprehensiveEsqlGauge,
  comprehensiveGaugeWithAdHocDataView,
  comprehensiveGaugeWithDataView,
  esqlGauge,
} from './lens_api_config.mock';
import {
  defaultColorByValueAttributes,
  gaugeAttributes,
  gaugeAttributesWithPercentageColorMode,
  gaugeESQLAttributes,
  selectorColorByValueAttributes,
} from './lens_state_config.mock';

describe('Gauge', () => {
  describe('state transform validation', () => {
    it('should convert a gauge chart with full config and absolute color mode', () => {
      validator.gauge.fromState(gaugeAttributes);
    });

    it('should convert a gauge chart with full config and percentage color mode', () => {
      validator.gauge.fromState(gaugeAttributesWithPercentageColorMode);
    });

    it('should convert a gauge chart with ESQL dataset', () => {
      validator.gauge.fromState(gaugeESQLAttributes);
    });

    it('should convert a default color by value palette', () => {
      validator.gauge.fromState(defaultColorByValueAttributes);
    });

    it('should convert a selector color by value palette', () => {
      validator.gauge.fromState(selectorColorByValueAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert a basic gauge chart with ad hoc dataView', () => {
      validator.gauge.fromApi(basicGaugeWithAdHocDataView);
    });

    it('should convert a basic gauge chart with dataView', () => {
      validator.gauge.fromApi(basicGaugeWithDataView);
    });

    it('should convert a ESQL-based gauge chart', () => {
      validator.gauge.fromApi(esqlGauge);
    });

    it('should convert a comprehensive gauge chart with ad hoc data view', () => {
      validator.gauge.fromApi(comprehensiveGaugeWithAdHocDataView);
    });

    it('should convert a comprehensive gauge chart with data view', () => {
      validator.gauge.fromApi(comprehensiveGaugeWithDataView);
    });

    it('should convert a comprehensive ESQL-based gauge chart', () => {
      validator.gauge.fromApi(comprehensiveEsqlGauge);
    });
  });

  describe('color default application', () => {
    const baseGauge = {
      type: 'gauge',
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
    } satisfies GaugeConfig;

    it('should emit AUTO_COLOR when no color is specified', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseGauge);
      const apiOutput = builder.toAPIFormat(lensState) as GaugeConfig;

      expect(apiOutput.metric.color).toEqual(AUTO_COLOR);
    });

    it('should emit NO_COLOR when color is explicitly set to `none`', () => {
      const config = {
        ...baseGauge,
        metric: { ...baseGauge.metric, color: NO_COLOR },
      } satisfies GaugeConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as GaugeConfig;

      expect(apiOutput.metric.color).toEqual(NO_COLOR);
    });
  });

  describe('ticks default application', () => {
    const baseGauge = {
      type: 'gauge',
      title: 'Ticks default test',
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
    } satisfies GaugeConfig;

    it('should emit the bands tick mode when no ticks are specified and keep it after schema parse', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseGauge);
      const apiOutput = builder.toAPIFormat(lensState) as GaugeConfig;
      const parsed = gaugeConfigSchema.parse(apiOutput) as GaugeConfig;

      expect(apiOutput.metric.ticks).toEqual({ visible: true, mode: 'bands' });
      expect(parsed.metric.ticks).toEqual({ visible: true, mode: 'bands' });
    });

    it('should not add a tick mode after schema parse when ticks are hidden', () => {
      const config = {
        ...baseGauge,
        metric: { ...baseGauge.metric, ticks: { visible: false, mode: 'auto' } },
      } satisfies GaugeConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as GaugeConfig;
      const parsed = gaugeConfigSchema.parse(apiOutput) as GaugeConfig;

      expect(apiOutput.metric.ticks).toEqual({ visible: false });
      expect(parsed.metric.ticks).toEqual({ visible: false });
    });
  });
});
