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

import { INVALID_SPANID, INVALID_TRACEID, trace } from '@opentelemetry/api';
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
 * Resolves the trace ID for a transaction: the documented `ids` field first,
 * then the private `traceId` / `trace.id` shapes older builds expose. Returns
 * `undefined` when the transaction carries no APM-shaped trace id; whether to
 * fall back to the active OTEL span context (`getActiveOtelTraceId`) is the
 * caller's decision, as that id may be unrelated to this transaction.
 */
export function getTraceId(transaction: agent.Transaction): string | undefined {
  const fromIds = transaction.ids?.['trace.id'];
  if (fromIds) return fromIds;
  const t = transaction as TransactionInternals;
  if (typeof t.traceId === 'string') return t.traceId;
  if (typeof t.trace?.id === 'string') return t.trace.id;

  return undefined;
}

/**
 * Reads the trace ID from the active OTEL span context, or `undefined` when no
 * span is active (or the context carries the all-zero invalid trace id).
 *
 * Exported separately because the helpers above require an `agent.Transaction`,
 * which does not exist under EDOT-only instrumentation.
 */
export function getActiveOtelTraceId(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (spanContext?.traceId && spanContext.traceId !== INVALID_TRACEID) {
    return spanContext.traceId;
  }

  return undefined;
}

/**
 * Reads the span ID from the active OTEL span context, or `undefined` when no
 * span is active (or the context carries the all-zero invalid span id). Used
 * as the `entryTransactionId` fallback under EDOT-only instrumentation.
 */
export function getActiveOtelSpanId(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (spanContext?.spanId && spanContext.spanId !== INVALID_SPANID) {
    return spanContext.spanId;
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
