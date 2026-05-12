/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isWellKnownWorkflowTriggerSource } from './well_known_trigger_sources';

describe('isWellKnownWorkflowTriggerSource', () => {
  it.each(['manual', 'scheduled', 'alert', 'workflow-step'] as const)(
    'returns true for %s',
    (value) => {
      expect(isWellKnownWorkflowTriggerSource(value)).toBe(true);
    }
  );

  it('returns false for event-style trigger ids', () => {
    expect(isWellKnownWorkflowTriggerSource('cases.caseCreated')).toBe(false);
    expect(isWellKnownWorkflowTriggerSource('example.customTrigger')).toBe(false);
  });

  it('returns false for legacy or mistyped values', () => {
    expect(isWellKnownWorkflowTriggerSource('system')).toBe(false);
    expect(isWellKnownWorkflowTriggerSource('workflow_step')).toBe(false);
    expect(isWellKnownWorkflowTriggerSource('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isWellKnownWorkflowTriggerSource(undefined)).toBe(false);
  });
});
