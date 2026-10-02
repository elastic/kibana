/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@kbn/core/public';

/** Event type reported by `RunWorkflowPanel` once per workflow run it dispatches. */
export const RUN_WORKFLOW_EXECUTED_EVENT_TYPE = 'workflows_run_workflow_executed' as const;

/** Reported when the caller does not say which surface mounted the panel. */
export const UNKNOWN_RUN_WORKFLOW_ORIGIN = 'unknown' as const;

/** Caller-supplied context that `RunWorkflowPanel` attaches to its run event. */
export interface RunWorkflowTelemetry {
  /** Surface the panel was mounted from, such as `alert`, `cases.case`, or `cases.attachment`. */
  origin: string;
  /** Attachment type the run targeted (such as `security.alert`), for case attachment origins. */
  attachmentType?: string;
  /** Number of items (alerts, attacks, documents, cases, observables, attachments) sent with the run. */
  itemCount?: number;
  /** Solution that rendered the panel, such as `securitySolution`. */
  owner?: string;
}

export interface RunWorkflowExecutedEvent {
  origin: string;
  attachment_type?: string;
  workflow_id: string;
  workflow_execution_id?: string;
  item_count?: number;
  succeeded: boolean;
  owner?: string;
}

/** Registration options for `RUN_WORKFLOW_EXECUTED_EVENT_TYPE`; registered by the Workflows Management plugin. */
export const runWorkflowExecutedEventType: EventTypeOpts<RunWorkflowExecutedEvent> = {
  eventType: RUN_WORKFLOW_EXECUTED_EVENT_TYPE,
  schema: {
    origin: {
      type: 'keyword',
      _meta: {
        description:
          'Surface the run was dispatched from, supplied by the caller (for example `alert`, `alert_bulk`, `attack`, `document`, `cases.case`, `cases.cases`, `cases.observable`, or `cases.attachment`). `unknown` when the caller supplies none.',
        optional: false,
      },
    },
    attachment_type: {
      type: 'keyword',
      _meta: {
        description:
          'Attachment type the run targeted (for example `security.alert` or `security.event`). Only set when `origin` is `cases.attachment` or `cases.attachments`.',
        optional: true,
      },
    },
    workflow_id: {
      type: 'keyword',
      _meta: {
        description: 'ID of the workflow that was run',
        optional: false,
      },
    },
    workflow_execution_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the resulting workflow execution; joins to the server-side workflow execution events. Absent when the dispatch failed.',
        optional: true,
      },
    },
    item_count: {
      type: 'integer',
      _meta: {
        description:
          'Number of items (alerts, attacks, documents, cases, observables, or attachments) sent with the run',
        optional: true,
      },
    },
    succeeded: {
      type: 'boolean',
      _meta: {
        description: 'Whether the workflow run was dispatched successfully',
        optional: false,
      },
    },
    owner: {
      type: 'keyword',
      _meta: {
        description: 'Solution that rendered the run workflow panel, such as `securitySolution`',
        optional: true,
      },
    },
  },
};
