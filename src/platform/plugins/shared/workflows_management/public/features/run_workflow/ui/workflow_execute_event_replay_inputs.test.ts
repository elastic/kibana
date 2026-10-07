/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTriggerReplayInput, TriggerEventReplaySource } from '@kbn/workflows';
import { buildTriggerEventReplayInputs } from './workflow_execute_event_replay_inputs';

describe('buildTriggerEventReplayInputs', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a typed EventTriggerReplayInput', () => {
    const replayInput: EventTriggerReplayInput = buildTriggerEventReplayInputs(
      {
        payload: { severity: 'high' },
      },
      'default'
    );

    expect(replayInput.event.severity).toBe('high');
    expect(replayInput.event.eventChainDepth).toBe(0);
  });

  it('merges payload with timestamp, spaceId, and default chain fields', () => {
    expect(
      buildTriggerEventReplayInputs(
        {
          '@timestamp': '2025-01-01T12:00:00.000Z',
          eventId: 'e1',
          triggerId: 'custom.trigger',
          spaceId: 'logged-space',
          payload: { foo: 'bar', nested: { n: 1 } },
        },
        'default'
      )
    ).toEqual({
      event: {
        foo: 'bar',
        nested: { n: 1 },
        timestamp: '2025-06-15T10:00:00.000Z',
        spaceId: 'default',
        eventChainDepth: 0,
        eventChainVisitedWorkflowIds: [],
      },
    });
  });

  it('treats non-object payload as empty', () => {
    expect(
      buildTriggerEventReplayInputs(
        {
          '@timestamp': '2025-01-01T12:00:00.000Z',
          spaceId: 'logged-space',
          payload: null,
        } as unknown as TriggerEventReplaySource,
        'acme'
      )
    ).toEqual({
      event: {
        timestamp: '2025-06-15T10:00:00.000Z',
        spaceId: 'acme',
        eventChainDepth: 0,
        eventChainVisitedWorkflowIds: [],
      },
    });
  });
});
