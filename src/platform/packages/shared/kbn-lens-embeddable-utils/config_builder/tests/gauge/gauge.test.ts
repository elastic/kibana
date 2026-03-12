/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validator } from '../utils/validator';
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
});
