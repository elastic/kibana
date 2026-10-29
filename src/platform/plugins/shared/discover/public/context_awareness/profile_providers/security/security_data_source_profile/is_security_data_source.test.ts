/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  containsOnlySecuritySourcePatterns,
  isSecurityDataViewId,
} from './is_security_data_source';

describe('containsOnlySecuritySourcePatterns', () => {
  describe('using the resolved indices', () => {
    it.each([
      '.alerts-security.alerts-default',
      '.internal.alerts-security.alerts-default-000001',
      '.preview.alerts-security.alerts-default',
      '.alerts-security.attack.discovery.alerts-default',
      '.adhoc.alerts-security.attack.discovery.alerts-default',
      '.siem-signals-default',
      'logs-endpoint.events.process-default',
      '.ds-logs-endpoint.events.network-default-000001',
      'logs-endpoint.alerts-default',
      'endgame-*',
      'logs-cloud_defend.process-default',
      'logs-ti_abusech.malware-default',
      'logs-cloud_security_posture.findings-default',
      'security_solution-acme.misconfiguration_latest',
      'logs-crowdstrike.alert-default',
      'logs-crowdstrike.falcon-default',
      'logs-crowdstrike.fdr-default',
      'logs-sentinel_one.activity-default',
      'logs-sentinel_one.alert-default',
      'logs-m365_defender.alert-default',
      'logs-m365_defender.event-default',
      'remote:.alerts-security.alerts-default',
      'logs-endpoint.events.process-*::data',
    ])('recognizes %s as Security data', (index) => {
      expect(containsOnlySecuritySourcePatterns([index], null)).toBe(true);
    });

    it.each([
      'logs-*',
      'logs-aws.cloudtrail-*',
      'filebeat-*',
      'traces-apm-*',
      'metrics-endpoint.metadata-*',
      '.logs-endpoint.actions-*',
      '.entity_analytics.*',
      'risk-score.risk-score-*',
      '.asset-criticality.asset-criticality-*',
      // Vendor datasets outside the alert/event allowlist are not Security sources.
      'logs-crowdstrike.host-default',
      'logs-crowdstrike.vulnerability-default',
      'logs-sentinel_one.agent-default',
      'logs-m365_defender.log-default',
      'logs-m365_defender.incident-default',
    ])('does not recognize %s as Security data', (index) => {
      expect(containsOnlySecuritySourcePatterns([index], null)).toBe(false);
    });

    it('requires every resolved index to be Security data', () => {
      expect(
        containsOnlySecuritySourcePatterns(
          [
            '.internal.alerts-security.alerts-default-000001',
            '.ds-logs-endpoint.events.process-default-2024.01.01-000001',
          ],
          null
        )
      ).toBe(true);
      expect(
        containsOnlySecuritySourcePatterns(
          [
            '.internal.alerts-security.alerts-default-000001',
            '.ds-logs-nginx.access-default-2024.01.01-000001',
          ],
          null
        )
      ).toBe(false);
    });
  });

  describe('falling back to the index pattern when no indices are resolved', () => {
    it('uses the index pattern when matchedIndices is undefined', () => {
      expect(containsOnlySecuritySourcePatterns(undefined, '.alerts-security.alerts-default')).toBe(
        true
      );
      expect(
        containsOnlySecuritySourcePatterns(
          undefined,
          '.alerts-security.alerts-default,logs-nginx.access-*'
        )
      ).toBe(false);
    });

    it('uses the index pattern when matchedIndices is empty', () => {
      expect(containsOnlySecuritySourcePatterns([], '.alerts-security.alerts-default')).toBe(true);
      expect(containsOnlySecuritySourcePatterns([], 'logs-nginx.access-*')).toBe(false);
    });

    it('ignores excluded (-) sources in the index pattern', () => {
      expect(
        containsOnlySecuritySourcePatterns(
          undefined,
          '.alerts-security.alerts-default,-logs-endpoint.events.file-*'
        )
      ).toBe(true);
    });

    it('prefers the resolved indices over the index pattern when both are present', () => {
      // Non-Security resolved indices win over a Security index pattern.
      expect(
        containsOnlySecuritySourcePatterns(
          ['logs-nginx.access-default'],
          '.alerts-security.alerts-*'
        )
      ).toBe(false);
      // Security resolved indices win over a non-Security index pattern.
      expect(
        containsOnlySecuritySourcePatterns(
          ['.alerts-security.alerts-default'],
          'logs-nginx.access-*'
        )
      ).toBe(true);
    });

    it('does not match when neither resolves to any source', () => {
      expect(containsOnlySecuritySourcePatterns(undefined, null)).toBe(false);
      expect(containsOnlySecuritySourcePatterns([], null)).toBe(false);
      expect(containsOnlySecuritySourcePatterns([], '')).toBe(false);
    });
  });
});

describe('isSecurityDataViewId', () => {
  it.each([
    'security-solution-default',
    'security-solution-alert-default',
    'security-solution-attack-default',
    'security_solution_cdr_latest_misconfigurations_v2-default',
    'security_solution_cdr_latest_vulnerabilities_v2-default',
    'cloud_security_posture-303eea10-c475-11ec-af18-c5b9b437dbbe',
  ])('recognizes managed data view %s', (dataViewId) => {
    expect(isSecurityDataViewId(dataViewId)).toBe(true);
  });
});
