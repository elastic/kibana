/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { legacyMetricStateSchema } from '../../schema/charts/legacy_metric';
import { validateConverter, validateAPIConverter } from '../validate';
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

describe('Legacy Metric', () => {
  describe('validateConverter', () => {
    it('should convert a simple legacy metric', () => {
      validateConverter(simpleLegacyMetricAttributes, legacyMetricStateSchema);
    });
  });

  describe('validateAPIConverter', () => {
    it('should convert abasic legacy metric chart with ad hoc dataView', () => {
      validateAPIConverter(basicLegacyMetricWithAdHocDataView, legacyMetricStateSchema);
    });

    it('should convert a basic legacy metric chart with dataView', () => {
      validateAPIConverter(basicLegacyMetricWithDataView, legacyMetricStateSchema);
    });

    it('should convert a ESQL-based legacy metric chart', () => {
      validateAPIConverter(esqlLegacyMetric, legacyMetricStateSchema);
    });

    it('should convert a comprehensive legacy metric chart with ad hoc data view', () => {
      validateAPIConverter(comprehensiveLegacyMetricWithAdHocDataView, legacyMetricStateSchema);
    });

    it('should convert a comprehensive legacy metric chart with data view', () => {
      validateAPIConverter(comprehensiveLegacyMetricWithDataView, legacyMetricStateSchema);
    });

    it('should convert a comprehensive ESQL-based legacy metric chart', () => {
      validateAPIConverter(comprehensiveEsqlLegacyMetric, legacyMetricStateSchema);
    });

    it('should convert a legacy metric chart with apply_color_to, but without color', () => {
      validateAPIConverter(legacyMetricWithApplyColorToWithoutColor, legacyMetricStateSchema, [
        'metric.apply_color_to',
      ]);
    });

    it('should convert a legacy metric chart with color, but without apply_color_to', () => {
      validateAPIConverter(legacyMetricWithColorWithoutApplyColorTo, legacyMetricStateSchema, [
        'metric.color',
      ]);
    });
  });
});
