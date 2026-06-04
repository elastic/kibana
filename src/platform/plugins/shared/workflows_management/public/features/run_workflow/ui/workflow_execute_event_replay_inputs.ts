/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EventTriggerReplayEvent,
  EventTriggerReplayInput,
  TriggerEventReplaySource,
} from '@kbn/workflows';

function readTriggerEventPayload(source: TriggerEventReplaySource): Record<string, unknown> {
  const rawPayload = source.payload;
  if (rawPayload !== null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
    return { ...(rawPayload as Record<string, unknown>) };
  }
  return {};
}

export function buildTriggerEventReplayInputs(
  source: TriggerEventReplaySource,
  currentSpaceId: string
): EventTriggerReplayInput {
  const payload = readTriggerEventPayload(source);

  const event: EventTriggerReplayEvent = {
    ...payload,
    timestamp: new Date().toISOString(),
    spaceId: currentSpaceId,
    eventChainDepth: 0,
    eventChainVisitedWorkflowIds: [],
  };

  return { event };
}

export type {
  EventTriggerReplayEvent,
  EventTriggerReplayInput,
  EventTriggerReplayPlatformFields,
  TriggerEventReplaySource,
  WorkflowsEventsLogDocumentSource,
} from '@kbn/workflows';
