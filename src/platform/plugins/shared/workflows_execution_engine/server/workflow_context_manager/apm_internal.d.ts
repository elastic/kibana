import type agent from 'elastic-apm-node';
/**
 * Reads the `alerting_rule_id` label off the upstream transaction's internal
 * label bag. Returns `undefined` when the label is absent or not a string.
 */
export declare function getAlertingRuleId(transaction: agent.Transaction | null): string | undefined;
/**
 * Resolves the trace ID for a transaction. Tries the documented `ids` field
 * first, then falls back to the private `traceId` / `trace.id` shapes that
 * older builds of `elastic-apm-node` expose.
 */
export declare function getTraceId(transaction: agent.Transaction): string | undefined;
/**
 * The agent exposes `currentTransaction` as a read property, but no public
 * setter. We rely on the private `setCurrentTransaction` to swap the active
 * transaction when an alerting-triggered workflow opens its own dedicated
 * transaction.
 */
export declare function setCurrentTransaction(apm: typeof agent, transaction: agent.Transaction): void;
