/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { simpleLegacyMetricAttributes } from './lens_state_config.mock';
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
      validator.legacyMetric.fromState(simpleLegacyMetricAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert abasic legacy metric chart with ad hoc dataView', () => {
      validator.legacyMetric.fromApi(basicLegacyMetricWithAdHocDataView);
    });

    it('should convert a basic legacy metric chart with dataView', () => {
      validator.legacyMetric.fromApi(basicLegacyMetricWithDataView);
    });

    it('should convert a ESQL-based legacy metric chart', () => {
      validator.legacyMetric.fromApi(esqlLegacyMetric);
    });

    it('should convert a comprehensive legacy metric chart with ad hoc data view', () => {
      validator.legacyMetric.fromApi(comprehensiveLegacyMetricWithAdHocDataView);
    });

    it('should convert a comprehensive legacy metric chart with data view', () => {
      validator.legacyMetric.fromApi(comprehensiveLegacyMetricWithDataView);
    });

    it('should convert a comprehensive ESQL-based legacy metric chart', () => {
      validator.legacyMetric.fromApi(comprehensiveEsqlLegacyMetric);
    });

    it('should convert a legacy metric chart with apply_color_to, but without color', () => {
      validator.legacyMetric.fromApi(legacyMetricWithApplyColorToWithoutColor, [
        'metric.apply_color_to',
      ]);
    });

    it('should convert a legacy metric chart with color, but without apply_color_to', () => {
      validator.legacyMetric.fromApi(legacyMetricWithColorWithoutApplyColorTo, ['metric.color']);
    });
  });
});
