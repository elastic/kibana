/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import {
  canAccessTriggersActionsRules,
  hasPlatformAlertReadCapabilities,
  hasPlatformRuleReadCapabilities,
} from './rule_capabilities';

const capabilities = (features: Record<string, unknown> = {}): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    ...features,
  } as Capabilities);

describe('canAccessTriggersActionsRules', () => {
  it('returns true when the triggersActionsRules capability is granted', () => {
    expect(
      canAccessTriggersActionsRules(
        capabilities({
          management: { insightsAndAlerting: { triggersActionsRules: true } },
        })
      )
    ).toBe(true);
  });

  it('returns false when the capability is explicitly denied', () => {
    expect(
      canAccessTriggersActionsRules(
        capabilities({
          management: { insightsAndAlerting: { triggersActionsRules: false } },
        })
      )
    ).toBe(false);
  });

  it('returns false when the insightsAndAlerting section is absent', () => {
    expect(canAccessTriggersActionsRules(capabilities({ management: {} }))).toBe(false);
  });

  it('returns false when the management section is absent', () => {
    expect(canAccessTriggersActionsRules({} as Capabilities)).toBe(false);
  });
});

describe('hasPlatformRuleReadCapabilities', () => {
  it.each([
    ['stack rules show', { stackAlerts: { show: true } }],
    ['the machine learning app privilege', { navLinks: { ml: true } }],
    ['data set quality show', { dataQuality: { show: true } }],
  ])('returns true for %s', (_label, features) => {
    expect(hasPlatformRuleReadCapabilities(capabilities(features))).toBe(true);
  });

  it('returns false for Actions and Connectors, Classic Rules Settings, and management alerts', () => {
    const managementOnly = capabilities({
      actions: { show: true },
      rulesSettings: { show: true },
      management: {
        insightsAndAlerting: {
          triggersActionsRules: true,
          triggersActionsAlerts: true,
          triggersActionsConnectors: true,
        },
      },
    });

    expect(canAccessTriggersActionsRules(managementOnly)).toBe(true);
    expect(hasPlatformRuleReadCapabilities(managementOnly)).toBe(false);
    expect(hasPlatformAlertReadCapabilities(managementOnly)).toBe(false);
  });

  it('returns true for the Machine Learning app privilege when canUseMlAlerts is off', () => {
    expect(
      hasPlatformRuleReadCapabilities(
        capabilities({
          navLinks: { ml: true },
          ml: { canUseMlAlerts: false },
        })
      )
    ).toBe(true);
  });

  it('returns false for the license-gated Machine Learning alerts capability alone', () => {
    expect(hasPlatformRuleReadCapabilities(capabilities({ ml: { canUseMlAlerts: true } }))).toBe(
      false
    );
  });

  it('returns false for the Machine Learning APM sub-privilege', () => {
    expect(hasPlatformRuleReadCapabilities(capabilities({ ml: { canGetJobs: true } }))).toBe(false);
  });

  it('returns false without any platform rules capability', () => {
    expect(hasPlatformRuleReadCapabilities(capabilities({}))).toBe(false);
  });

  it('returns false for Observability and Security privileges', () => {
    expect(
      hasPlatformRuleReadCapabilities(
        capabilities({
          navLinks: { apm: true },
          logs: { show: true },
          observabilityAlerts: { show: true },
          securitySolutionRulesV4: { read_rules: true },
          siem: { show: true },
        })
      )
    ).toBe(false);
  });

  it('returns false for alert-only Stack Alerts', () => {
    expect(hasPlatformRuleReadCapabilities(capabilities({ stackAlertsOnly: { show: true } }))).toBe(
      false
    );
  });
});

describe('hasPlatformAlertReadCapabilities', () => {
  it.each([
    ['stack rules show', { stackAlerts: { show: true } }],
    ['alert-only Stack Alerts', { stackAlertsOnly: { show: true } }],
  ])('returns true for %s', (_label, features) => {
    expect(hasPlatformAlertReadCapabilities(capabilities(features))).toBe(true);
  });

  it.each([
    ['the machine learning app privilege', { navLinks: { ml: true } }],
    ['data set quality show', { dataQuality: { show: true } }],
  ])('returns false for %s, which can read rules but does not grant rac', (_label, features) => {
    expect(hasPlatformRuleReadCapabilities(capabilities(features))).toBe(true);
    expect(hasPlatformAlertReadCapabilities(capabilities(features))).toBe(false);
  });

  it('returns false without any platform alerts capability', () => {
    expect(hasPlatformAlertReadCapabilities(capabilities({}))).toBe(false);
  });
});
