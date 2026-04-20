/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootSchema } from '@kbn/core/server';

export const WORKFLOWS_TRIGGER_EVENT_DISPATCHED = 'workflows_trigger_event_dispatched';

export interface TriggerEventDispatchedTelemetryEvent {
  triggerId: string;
  executionEnabled: boolean;
  logEventsEnabled: boolean;
  /** Event-chain depth at dispatch time (0 when emit is not under a prior chain hop). */
  eventChainDepth: number;
  /** UUID for this trigger dispatch; matches `.workflows-events` eventId, `context.metadata.eventId`, and execution `dispatchEventId`. */
  eventId: string;
  /** Workflow execution id of the hop that emitted into this chain, when present. */
  sourceExecutionId?: string;
  /** True when execution is off but trigger-event audit logging still runs. */
  auditOnly: boolean;
  /** Time spent resolving/filtering subscribed workflows before scheduling decisions (ms). */
  subscriberResolutionMs?: number;
  subscribedCount: number;
  disabledCount: number;
  kqlFalseCount: number;
  kqlErrorCount: number;
  matchedCount: number;
  depthSkippedCount: number;
  scheduledAttemptCount: number;
  scheduledSuccessCount: number;
  scheduledFailureCount: number;
}

export const triggerEventDispatchedSchema: RootSchema<TriggerEventDispatchedTelemetryEvent> = {
  triggerId: {
    type: 'keyword',
    _meta: {
      description: 'Event trigger id handled by workflows trigger event handler',
      optional: false,
    },
  },
  executionEnabled: {
    type: 'boolean',
    _meta: { description: 'Whether event-driven execution is enabled', optional: false },
  },
  logEventsEnabled: {
    type: 'boolean',
    _meta: { description: 'Whether trigger event audit logging is enabled', optional: false },
  },
  eventChainDepth: {
    type: 'integer',
    _meta: {
      description: 'Event-chain depth at this emit (from request chain context; 0 for root emits)',
      optional: false,
    },
  },
  eventId: {
    type: 'keyword',
    _meta: {
      description:
        'UUID for this trigger dispatch; correlates with trigger-events audit, context.metadata.eventId, and execution dispatchEventId',
      optional: false,
    },
  },
  sourceExecutionId: {
    type: 'keyword',
    _meta: {
      description: 'Workflow execution id of the chain hop that emitted this event, when set',
      optional: true,
    },
  },
  auditOnly: {
    type: 'boolean',
    _meta: {
      description:
        'True when event-driven execution is disabled but trigger event logging still ran (audit path)',
      optional: false,
    },
  },
  subscriberResolutionMs: {
    type: 'long',
    _meta: {
      description:
        'Elapsed milliseconds spent resolving/filtering subscribed workflows for this trigger dispatch',
      optional: true,
    },
  },
  subscribedCount: {
    type: 'integer',
    _meta: { description: 'Number of subscribed workflows returned from storage', optional: false },
  },
  disabledCount: {
    type: 'integer',
    _meta: {
      description: 'Number of subscribed workflows skipped because disabled',
      optional: false,
    },
  },
  kqlFalseCount: {
    type: 'integer',
    _meta: { description: 'Number of workflows filtered out by KQL false result', optional: false },
  },
  kqlErrorCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows filtered out by KQL evaluation error',
      optional: false,
    },
  },
  matchedCount: {
    type: 'integer',
    _meta: {
      description: 'Number of workflows matched after enabled + KQL checks',
      optional: false,
    },
  },
  depthSkippedCount: {
    type: 'integer',
    _meta: {
      description: 'Number of matched workflows skipped by max event chain depth',
      optional: false,
    },
  },
  scheduledAttemptCount: {
    type: 'integer',
    _meta: { description: 'Number of schedule attempts sent to execution engine', optional: false },
  },
  scheduledSuccessCount: {
    type: 'integer',
    _meta: { description: 'Number of successful schedule calls', optional: false },
  },
  scheduledFailureCount: {
    type: 'integer',
    _meta: { description: 'Number of failed schedule calls', optional: false },
  },
};
