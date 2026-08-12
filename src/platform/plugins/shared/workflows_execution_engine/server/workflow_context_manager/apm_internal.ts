/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Localised exception: `elastic-apm-node` does not type the internal `_labels`
// bag, the `traceId` field, or the agent's `setCurrentTransaction` API. The
// rest of the workflow engine is `any`-free; this module is the chokepoint
// where the upstream typing gaps are absorbed so they don't bleed elsewhere.

import { INVALID_TRACEID, trace } from '@opentelemetry/api';
import type agent from 'elastic-apm-node';

type ApmAgentInternals = typeof agent & {
  setCurrentTransaction: (transaction: agent.Transaction) => void;
};

type TransactionInternals = agent.Transaction & {
  _labels?: Record<string, unknown>;
  traceId?: string;
  trace?: { id?: string };
};

/**
 * Reads the `alerting_rule_id` label off the upstream transaction's internal
 * label bag. Returns `undefined` when the label is absent or not a string.
 */
export function getAlertingRuleId(transaction: agent.Transaction | null): string | undefined {
  if (!transaction) return undefined;
  const value = (transaction as TransactionInternals)._labels?.alerting_rule_id;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Resolves the trace ID for a transaction. Tries the documented `ids` field
 * first, then falls back to the private `traceId` / `trace.id` shapes that
 * older builds of `elastic-apm-node` expose.
 *
 * Finally falls back to the active OTEL span context. `elastic-apm-node` is deprecated in favour
 * of the EDOT collector, and under EDOT-only instrumentation (e.g. the Scout eval stack, which
 * runs EDOT via `ensureEdot` but no APM agent) every APM-shaped lookup above returns undefined —
 * spans ARE being exported, the engine just could not see their trace id. Measured 2026-08-11:
 * 7/7 workflow executions persisted `traceId: undefined`, which silently degraded the eval
 * suite's trace-based routing evaluator to N/A on every example.
 *
 * Mirrors the `apm ?? trace.getActiveSpan()` precedent in core (`http_server.ts`, `logger.ts`,
 * `analytics_service.ts`). APM is still tried first so behaviour is unchanged wherever the
 * legacy agent is active.
 */
export function getTraceId(transaction: agent.Transaction): string | undefined {
  const fromIds = transaction.ids?.['trace.id'];
  if (fromIds) return fromIds;
  const t = transaction as TransactionInternals;
  if (typeof t.traceId === 'string') return t.traceId;
  if (typeof t.trace?.id === 'string') return t.trace.id;

  // EDOT / OTEL-only path.
  return getActiveOtelTraceId();
}

/**
 * Reads the trace ID from the active OTEL span context, or `undefined` when no span is active
 * (or the context is the all-zero invalid trace id).
 *
 * This exists as a standalone export because the APM-shaped helpers above are only reachable
 * when `agent.currentTransaction` is non-null. Under EDOT-only instrumentation there is no APM
 * agent at all, so callers must be able to resolve a trace id WITHOUT first obtaining an
 * `agent.Transaction` — see the `else` branch of `WorkflowExecutionRuntimeManager.start()`.
 */
export function getActiveOtelTraceId(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (spanContext?.traceId && spanContext.traceId !== INVALID_TRACEID) {
    return spanContext.traceId;
  }

  return undefined;
}

/**
 * The agent exposes `currentTransaction` as a read property, but no public
 * setter. We rely on the private `setCurrentTransaction` to swap the active
 * transaction when an alerting-triggered workflow opens its own dedicated
 * transaction.
 */
export function setCurrentTransaction(apm: typeof agent, transaction: agent.Transaction): void {
  (apm as ApmAgentInternals).setCurrentTransaction(transaction);
}
