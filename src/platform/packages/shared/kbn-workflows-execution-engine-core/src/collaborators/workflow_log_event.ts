/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Structural log-event shape consumed by `IWorkflowEventLogger`.
 *
 * This mirrors the public fields that flow-control nodes write — `@timestamp`,
 * `message`, `level`, `workflow`, `event`, `tags`, `labels`, `error`. The
 * plugin owns a richer mapping-derived `WorkflowLogEvent` that extends this
 * structurally, so existing plugin code continues to compile unchanged.
 *
 * The shape is intentionally open: any additional fields the plugin writes
 * (e.g. APM-specific labels) flow through without changes here.
 */
export interface WorkflowLogEvent {
  '@timestamp'?: string;
  message?: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  workflow?: {
    id?: string;
    name?: string;
    execution_id?: string;
    step_id?: string;
    step_execution_id?: string;
    step_name?: string;
    step_type?: string;
  };
  event?: {
    action?: string;
    category?: string[];
    type?: string[];
    provider?: string;
    outcome?: 'success' | 'failure' | 'unknown';
    duration?: number;
    start?: string;
    end?: string;
  };
  tags?: string[];
  labels?: Record<string, string | number | boolean | undefined>;
  error?: {
    message?: string;
    stack_trace?: string;
    type?: string;
  };
  // Open shape: callers may carry additional structured fields.
  [extra: string]: unknown;
}
