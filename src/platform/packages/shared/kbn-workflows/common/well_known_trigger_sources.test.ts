/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getEventDrivenWorkflowTriggerEvidence,
  isEventDrivenWorkflowTriggerSource,
  isWellKnownWorkflowTriggerSource,
} from './well_known_trigger_sources';

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

describe('isEventDrivenWorkflowTriggerSource', () => {
  it('returns true when triggeredBy is a registered event id and event payload is present', () => {
    expect(
      isEventDrivenWorkflowTriggerSource({
        triggeredBy: 'cases.caseCreated',
        context: { event: { caseId: 'case-1' } },
      })
    ).toBe(true);
  });

  it('returns true when triggeredBy is not well-known and metadata.eventTriggerId is set', () => {
    expect(
      isEventDrivenWorkflowTriggerSource({
        triggeredBy: 'cases.caseCreated',
        metadata: { eventTriggerId: 'cases.caseCreated' },
      })
    ).toBe(true);
  });

  it('returns true when triggeredBy is not well-known and dispatchEventId is set', () => {
    expect(
      isEventDrivenWorkflowTriggerSource({
        triggeredBy: 'cases.caseCreated',
        dispatchEventId: 'evt-1',
      })
    ).toBe(true);
  });

  it('returns true when event dispatch metadata lives only on context.metadata', () => {
    expect(
      isEventDrivenWorkflowTriggerSource({
        triggeredBy: 'cases.caseCreated',
        context: {
          metadata: {
            eventTriggerId: 'cases.caseCreated',
            eventId: 'evt-1',
          },
        },
      })
    ).toBe(true);
  });

  it.each([
    'attack-discovery-pipeline',
    'attack-discovery-skill-report',
    'attack-discovery-scheduled',
    'significant-events-memory-synthesis',
    'significant-events-memory-ui',
    'evals-run-now',
    'evals-skill-run',
    'action_policy',
  ])('returns false for custom provenance string %s without event evidence', (triggeredBy) => {
    expect(isEventDrivenWorkflowTriggerSource({ triggeredBy })).toBe(false);
  });

  it('returns false for custom provenance even when unrelated metadata is present', () => {
    expect(
      isEventDrivenWorkflowTriggerSource({
        triggeredBy: 'evals-run-now',
        metadata: { execution_id: 'eval-1' },
      })
    ).toBe(false);
  });

  it.each(['manual', 'scheduled', 'alert', 'workflow-step'] as const)(
    'returns false for well-known source %s even when event payload is present',
    (triggeredBy) => {
      expect(
        isEventDrivenWorkflowTriggerSource({
          triggeredBy,
          context: { event: { type: triggeredBy } },
        })
      ).toBe(false);
    }
  );

  it('returns false for empty or missing triggeredBy', () => {
    expect(isEventDrivenWorkflowTriggerSource({ triggeredBy: '' })).toBe(false);
    expect(isEventDrivenWorkflowTriggerSource({ triggeredBy: undefined })).toBe(false);
    expect(isEventDrivenWorkflowTriggerSource({})).toBe(false);
  });
});

describe('getEventDrivenWorkflowTriggerEvidence', () => {
  it('prefers top-level metadata over context.metadata', () => {
    expect(
      getEventDrivenWorkflowTriggerEvidence({
        triggeredBy: 'cases.caseCreated',
        dispatchEventId: 'root-event-id',
        metadata: { eventTriggerId: 'from-top', eventId: 'from-top-id' },
        context: {
          event: { caseId: '1' },
          metadata: { eventTriggerId: 'from-nested', eventId: 'from-nested-id' },
        },
      })
    ).toEqual({
      triggeredBy: 'cases.caseCreated',
      event: { caseId: '1' },
      eventTriggerId: 'from-top',
      eventId: 'root-event-id',
    });
  });

  it('falls back to context.metadata when top-level metadata is absent', () => {
    expect(
      getEventDrivenWorkflowTriggerEvidence({
        triggeredBy: 'cases.updated',
        context: {
          event: { caseId: '2' },
          metadata: { eventTriggerId: 'cases.updated', eventId: 'nested-id' },
        },
      })
    ).toEqual({
      triggeredBy: 'cases.updated',
      event: { caseId: '2' },
      eventTriggerId: 'cases.updated',
      eventId: 'nested-id',
    });
  });
});
