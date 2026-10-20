/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shape of a `.workflows-events` document returned by trigger-event log search.
 * Mirrors the execution engine trigger-event document shape.
 */
export interface WorkflowsEventsLogDocumentSource {
  '@timestamp': string;
  eventId: string;
  triggerId: string;
  spaceId: string;
  subscriptions: string[];
  sourceExecutionId?: string;
  payload: Record<string, unknown>;
}

/**
 * `_source` from a trigger-event log hit used to build a manual replay payload.
 * Fields other than `payload` are ignored today but documented for callers.
 */
export type TriggerEventReplaySource = Partial<WorkflowsEventsLogDocumentSource>;

/**
 * Platform fields injected when replaying a logged trigger event from the Event tab.
 * Custom trigger payload properties are merged at the same level (see {@link EventTriggerReplayEvent}).
 */
export interface EventTriggerReplayPlatformFields {
  /** ISO-8601 time for this test run (not the logged `@timestamp`). */
  timestamp: string;
  /** Active Kibana space for the replay run. */
  spaceId: string;
  /** Reset for manual replay so chain depth does not carry over from production dispatch. */
  eventChainDepth: 0;
  /** Reset for manual replay so cycle detection starts fresh. */
  eventChainVisitedWorkflowIds: string[];
}

/**
 * `event` object passed to a manual / test workflow run for an event-driven trigger.
 * Trigger-specific payload fields from the log entry are spread alongside platform fields.
 */
export type EventTriggerReplayEvent = EventTriggerReplayPlatformFields & Record<string, unknown>;

/**
 * Top-level workflow run `inputs` JSON built when selecting a row in the Event trigger picker.
 */
export interface EventTriggerReplayInput {
  event: EventTriggerReplayEvent;
}
