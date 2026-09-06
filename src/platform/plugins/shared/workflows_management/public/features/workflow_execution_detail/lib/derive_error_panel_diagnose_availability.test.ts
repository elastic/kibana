/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AGENT_BUILDER_REQUIRED_LICENSE_TIER,
  deriveErrorPanelDiagnoseAvailability,
  effectiveErrorPanelDiagnoseState,
} from './derive_error_panel_diagnose_availability';

describe('deriveErrorPanelDiagnoseAvailability', () => {
  it('returns D when Agent Builder is absent', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: false,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: true, hasLlmConnector: true },
      })
    ).toBe('d');
  });

  it('returns D when show privilege is missing', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: false,
        access: { hasRequiredLicense: true, hasLlmConnector: true },
      })
    ).toBe('d');
  });

  it('returns D when access is unknown (loading or error)', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: null,
      })
    ).toBe('d');
  });

  it('returns C when license is insufficient', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: false, hasLlmConnector: true },
      })
    ).toBe('c');
  });

  it('returns B when licensed but no LLM connector', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: true, hasLlmConnector: false },
      })
    ).toBe('b');
  });

  it('returns A when licensed with an LLM connector', () => {
    expect(
      deriveErrorPanelDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: true, hasLlmConnector: true },
      })
    ).toBe('a');
  });

  it('exposes the Agent Builder required license tier for C-state copy', () => {
    expect(AGENT_BUILDER_REQUIRED_LICENSE_TIER).toBe('enterprise');
  });
});

describe('effectiveErrorPanelDiagnoseState', () => {
  it('gates A and B to D when the diagnose feature flag is off', () => {
    expect(effectiveErrorPanelDiagnoseState('a', false)).toBe('d');
    expect(effectiveErrorPanelDiagnoseState('b', false)).toBe('d');
  });

  it('keeps C and D when the diagnose feature flag is off', () => {
    expect(effectiveErrorPanelDiagnoseState('c', false)).toBe('c');
    expect(effectiveErrorPanelDiagnoseState('d', false)).toBe('d');
  });

  it('passes through A–D when the diagnose feature flag is on', () => {
    expect(effectiveErrorPanelDiagnoseState('a', true)).toBe('a');
    expect(effectiveErrorPanelDiagnoseState('b', true)).toBe('b');
    expect(effectiveErrorPanelDiagnoseState('c', true)).toBe('c');
    expect(effectiveErrorPanelDiagnoseState('d', true)).toBe('d');
  });
});
