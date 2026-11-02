/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OBSERVABILITY_RULE_TYPE_IDS } from './o11y_rules';
import {
  OBS_ALERTING_FEATURES,
  APM_ALERTING_FEATURES,
  METRIC_ALERTING_FEATURES,
  LOG_ALERTING_FEATURES,
  LOG_ALERTING_FEATURES_WITH_SHARED,
  METRIC_ALERTING_FEATURES_WITH_SHARED,
  SLO_ALERTING_FEATURES,
  SYNTHETICS_ALERTING_FEATURES,
} from './o11y_alerting_features';

describe('o11y_alerting_features', () => {
  describe('OBS_ALERTING_FEATURES', () => {
    it('contains all observability rule type IDs', () => {
      const ruleTypeIds = OBS_ALERTING_FEATURES.map((f) => f.ruleTypeId);
      for (const id of OBSERVABILITY_RULE_TYPE_IDS) {
        expect(ruleTypeIds).toContain(id);
      }
    });

    it('every entry includes the alerts and observability consumers', () => {
      for (const entry of OBS_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('alerts');
        expect(entry.consumers).toContain('observability');
      }
    });
  });

  describe('per-plugin arrays', () => {
    it('APM_ALERTING_FEATURES entries have apm consumer', () => {
      for (const entry of APM_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('apm');
      }
    });

    it('METRIC_ALERTING_FEATURES entries have infrastructure consumer', () => {
      for (const entry of METRIC_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('infrastructure');
      }
    });

    it('METRIC_ALERTING_FEATURES_WITH_SHARED includes shared rule types', () => {
      const ids = METRIC_ALERTING_FEATURES_WITH_SHARED.map((f) => f.ruleTypeId);
      expect(ids).toContain('.es-query');
      expect(ids).toContain('observability.rules.custom_threshold');
      expect(ids).toContain('xpack.ml.anomaly_detection_alert');
    });

    it('LOG_ALERTING_FEATURES entries have logs consumer', () => {
      for (const entry of LOG_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('logs');
      }
    });

    it('LOG_ALERTING_FEATURES_WITH_SHARED includes shared rule types', () => {
      const ids = LOG_ALERTING_FEATURES_WITH_SHARED.map((f) => f.ruleTypeId);
      expect(ids).toContain('.es-query');
      expect(ids).toContain('observability.rules.custom_threshold');
      expect(ids).toContain('xpack.ml.anomaly_detection_alert');
    });

    it('SLO_ALERTING_FEATURES entries have slo consumer', () => {
      for (const entry of SLO_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('slo');
      }
    });

    it('SYNTHETICS_ALERTING_FEATURES entries have uptime consumer', () => {
      for (const entry of SYNTHETICS_ALERTING_FEATURES) {
        expect(entry.consumers).toContain('uptime');
      }
    });
  });
});
