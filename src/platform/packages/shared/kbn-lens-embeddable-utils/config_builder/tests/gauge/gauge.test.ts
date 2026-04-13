/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gaugeConfigSchema } from '../../schema/charts/gauge';
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
});
