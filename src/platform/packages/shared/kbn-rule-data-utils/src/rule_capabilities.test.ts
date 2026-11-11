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
  hasClassicAlertsReadCapability,
  hasClassicRulesReadCapability,
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

describe('hasClassicRulesReadCapability', () => {
  const capabilities = (features: Record<string, unknown>): Capabilities =>
    ({
      navLinks: {},
      management: {},
      catalogue: {},
      ...features,
    } as Capabilities);

  it.each([
    ['an observability nav link', { navLinks: { apm: true } }],
    ['logs show', { logs: { show: true } }],
    ['stack rules show', { stackAlerts: { show: true } }],
    ['the machine learning app privilege', { navLinks: { ml: true } }],
    ['data set quality show', { dataQuality: { show: true } }],
    ['security rules read', { securitySolutionRulesV4: { read_rules: true } }],
    ['a legacy security rules feature', { securitySolutionRulesV1: { read_rules: true } }],
  ])('returns true for %s', (_label, features) => {
    expect(hasClassicRulesReadCapability(capabilities(features))).toBe(true);
  });

  it('returns false for the Stack Management Rules capability alone', () => {
    expect(
      hasClassicRulesReadCapability(
        capabilities({
          management: { insightsAndAlerting: { triggersActionsRules: true } },
        })
      )
    ).toBe(false);
  });

  it('returns false for Actions and Connectors and Classic Rules Settings', () => {
    expect(
      hasClassicRulesReadCapability(
        capabilities({
          actions: { show: true },
          rulesSettings: { show: true },
          management: {
            insightsAndAlerting: {
              triggersActionsRules: true,
              triggersActionsConnectors: true,
            },
          },
        })
      )
    ).toBe(false);
  });

  it('returns true for the Machine Learning app privilege when canUseMlAlerts is off', () => {
    expect(
      hasClassicRulesReadCapability(
        capabilities({
          navLinks: { ml: true },
          ml: { canUseMlAlerts: false },
        })
      )
    ).toBe(true);
  });

  it('returns false for the license-gated Machine Learning alerts capability alone', () => {
    expect(hasClassicRulesReadCapability(capabilities({ ml: { canUseMlAlerts: true } }))).toBe(
      false
    );
  });

  it('returns false for the Machine Learning APM sub-privilege', () => {
    expect(hasClassicRulesReadCapability(capabilities({ ml: { canGetJobs: true } }))).toBe(false);
  });

  it('returns false without any rules capability', () => {
    expect(hasClassicRulesReadCapability(capabilities({}))).toBe(false);
  });

  it('returns false for alert-only features', () => {
    expect(
      hasClassicRulesReadCapability(capabilities({ observabilityAlerts: { show: true } }))
    ).toBe(false);
    expect(hasClassicRulesReadCapability(capabilities({ stackAlertsOnly: { show: true } }))).toBe(
      false
    );
  });
});

describe('hasClassicAlertsReadCapability', () => {
  const capabilities = (features: Record<string, unknown>): Capabilities =>
    ({
      navLinks: {},
      management: {},
      catalogue: {},
      ...features,
    } as Capabilities);

  it.each([
    ['an observability nav link', { navLinks: { apm: true } }],
    ['logs show', { logs: { show: true } }],
    ['stack rules show', { stackAlerts: { show: true } }],
    ['the machine learning app privilege', { navLinks: { ml: true } }],
    ['data set quality show', { dataQuality: { show: true } }],
    ['security rules read', { securitySolutionRulesV4: { read_rules: true } }],
    ['observability alerts show', { observabilityAlerts: { show: true } }],
    ['stack alerts only show', { stackAlertsOnly: { show: true } }],
  ])('returns true for %s', (_label, features) => {
    expect(hasClassicAlertsReadCapability(capabilities(features))).toBe(true);
  });

  it('returns false when only management rule and alert capabilities are granted', () => {
    expect(
      hasClassicAlertsReadCapability(
        capabilities({
          actions: { show: true },
          rulesSettings: { show: true },
          management: {
            insightsAndAlerting: {
              triggersActionsRules: true,
              triggersActionsAlerts: true,
              triggersActionsConnectors: true,
            },
          },
        })
      )
    ).toBe(false);
  });

  it('returns false without any alerts capability', () => {
    expect(hasClassicAlertsReadCapability(capabilities({}))).toBe(false);
  });
});
