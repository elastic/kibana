/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gaugeStateSchema } from '../../schema/charts/gauge';
import { validateAPIConverter, validateConverter } from '../validate';
import {
  basicGaugeWithAdHocDataView,
  basicGaugeWithDataView,
  comprehensiveEsqlGauge,
  comprehensiveGaugeWithAdHocDataView,
  comprehensiveGaugeWithDataView,
  esqlGauge,
} from './lens_api_config.mock';
import { gaugeAttributes, gaugeESQLAttributes } from './lens_state_config.mock';

describe('Gauge', () => {
  describe('validateConverter', () => {
    it('should convert a gauge chart with full config', () => {
      validateConverter(gaugeAttributes, gaugeStateSchema);
    });
    it('should convert a gauge chart with ESQL dataset', () => {
      validateConverter(gaugeESQLAttributes, gaugeStateSchema);
    });
  });
  describe('validateAPIConverter', () => {
    it('should convert a basic legacy metric chart with ad hoc dataView', () => {
      validateAPIConverter(basicGaugeWithAdHocDataView, gaugeStateSchema);
    });

    it('should convert a basic legacy metric chart with dataView', () => {
      validateAPIConverter(basicGaugeWithDataView, gaugeStateSchema);
    });

    it('should convert a ESQL-based legacy metric chart', () => {
      validateAPIConverter(esqlGauge, gaugeStateSchema);
    });

    it('should convert a comprehensive legacy metric chart with ad hoc data view', () => {
      validateAPIConverter(comprehensiveGaugeWithAdHocDataView, gaugeStateSchema);
    });

    it('should convert a comprehensive legacy metric chart with data view', () => {
      validateAPIConverter(comprehensiveGaugeWithDataView, gaugeStateSchema);
    });

    it('should convert a comprehensive ESQL-based legacy metric chart', () => {
      validateAPIConverter(comprehensiveEsqlGauge, gaugeStateSchema);
    });
  });
});
