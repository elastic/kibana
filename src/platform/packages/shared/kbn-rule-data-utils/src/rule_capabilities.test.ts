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

describe('canAccessTriggersActionsRules', () => {
  it('returns true when the triggersActionsRules capability is granted', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: true } },
    } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(true);
  });

  it('returns false when the capability is explicitly denied', () => {
    const capabilities = {
      management: { insightsAndAlerting: { triggersActionsRules: false } },
    } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });

  it('returns false when the insightsAndAlerting section is absent', () => {
    const capabilities = { management: {} } as unknown as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });

  it('returns false when the management section is absent', () => {
    const capabilities = {} as Capabilities;

    expect(canAccessTriggersActionsRules(capabilities)).toBe(false);
  });
});

describe('hasPlatformRuleReadCapabilities', () => {
  const capabilities = (features: Record<string, unknown>): Capabilities =>
    ({
      navLinks: {},
      management: {},
      catalogue: {},
      ...features,
    } as Capabilities);

  it.each([
    ['stack rules show', { stackAlerts: { show: true } }],
    ['the machine learning app privilege', { navLinks: { ml: true } }],
    ['data set quality show', { dataQuality: { show: true } }],
  ])('returns true for %s', (_label, features) => {
    expect(hasPlatformRuleReadCapabilities(capabilities(features))).toBe(true);
    expect(hasPlatformAlertReadCapabilities(capabilities(features))).toBe(true);
  });

  it('returns false for Actions and Connectors and Classic Rules Settings', () => {
    const actionsAndConnectors = capabilities({
      actions: { show: true },
      rulesSettings: { show: true },
      management: {
        insightsAndAlerting: {
          triggersActionsRules: true,
          triggersActionsConnectors: true,
        },
      },
    });

    expect(canAccessTriggersActionsRules(actionsAndConnectors)).toBe(true);
    expect(hasPlatformRuleReadCapabilities(actionsAndConnectors)).toBe(false);
    expect(hasPlatformAlertReadCapabilities(actionsAndConnectors)).toBe(false);
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
  const capabilities = (features: Record<string, unknown>): Capabilities =>
    ({
      navLinks: {},
      management: {},
      catalogue: {},
      ...features,
    } as Capabilities);

  it('returns true for alert-only Stack Alerts', () => {
    const stackAlertsOnly = capabilities({ stackAlertsOnly: { show: true } });

    expect(hasPlatformAlertReadCapabilities(stackAlertsOnly)).toBe(true);
    expect(hasPlatformRuleReadCapabilities(stackAlertsOnly)).toBe(false);
  });

  it('returns false when only management rule and alert capabilities are granted', () => {
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
    expect(hasPlatformAlertReadCapabilities(managementOnly)).toBe(false);
  });

  it('returns false without any platform alerts capability', () => {
    expect(hasPlatformAlertReadCapabilities(capabilities({}))).toBe(false);
  });
});
