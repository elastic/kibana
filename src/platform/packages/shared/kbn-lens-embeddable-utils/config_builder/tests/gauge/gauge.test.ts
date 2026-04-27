/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import { gaugeConfigSchema } from '../../schema/charts/gauge';
import type { GaugeConfig } from '../../schema/charts/gauge';
import { AUTO_COLOR, NO_COLOR } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
import { validateAPIConverter, validateConverter } from '../validate';
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
  describe('validateConverter', () => {
    it('should convert a gauge chart with full config and absolute color mode', () => {
      validateConverter(gaugeAttributes, gaugeConfigSchema);
    });

    it('should convert a gauge chart with full config and percentage color mode', () => {
      validateConverter(gaugeAttributesWithPercentageColorMode, gaugeConfigSchema);
    });

    it('should convert a gauge chart with ESQL datasource', () => {
      validateConverter(gaugeESQLAttributes, gaugeConfigSchema);
    });

    it('should convert a default color by value palette', () => {
      validateConverter(defaultColorByValueAttributes, gaugeConfigSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(selectorColorByValueAttributes, gaugeConfigSchema);
    });
  });
  describe('validateAPIConverter', () => {
    it('should convert a basic gauge chart with ad hoc dataView', () => {
      validateAPIConverter(basicGaugeWithAdHocDataView, gaugeConfigSchema);
    });

    it('should convert a basic gauge chart with dataView', () => {
      validateAPIConverter(basicGaugeWithDataView, gaugeConfigSchema);
    });

    it('should convert a ESQL-based gauge chart', () => {
      validateAPIConverter(esqlGauge, gaugeConfigSchema);
    });

    it('should convert a comprehensive gauge chart with ad hoc data view', () => {
      validateAPIConverter(comprehensiveGaugeWithAdHocDataView, gaugeConfigSchema);
    });

    it('should convert a comprehensive gauge chart with data view', () => {
      validateAPIConverter(comprehensiveGaugeWithDataView, gaugeConfigSchema);
    });

    it('should convert a comprehensive ESQL-based gauge chart', () => {
      validateAPIConverter(comprehensiveEsqlGauge, gaugeConfigSchema);
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
});
