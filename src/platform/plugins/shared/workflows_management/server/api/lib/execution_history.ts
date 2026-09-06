/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import type { WorkflowExecutionListDto } from '@kbn/workflows';

export interface ExecutionHistoryPoint {
  bucket: string;
  total: number;
  failed: number;
  succeeded: number;
  avgDurationMs: number | null;
}

export interface ExecutionHistorySummary {
  workflowId: string;
  points: ExecutionHistoryPoint[];
  totals: { total: number; failed: number; succeeded: number; avgDurationMs: number | null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Aggregate a workflow execution list into fixed daily buckets suitable for
 * ops dashboards (WF-007). Executions missing startedAt are ignored.
 */
export const aggregateExecutionHistory = (
  workflowId: string,
  executions: WorkflowExecutionListDto['executions'],
  days = 30
): ExecutionHistorySummary => {
  const now = Date.now();
  const startOfWindow = now - days * DAY_MS;
  const buckets = new Map<string, { total: number; failed: number; succeeded: number; durations: number[] }>();
  for (let d = 0; d < days; d += 1) {
    const day = new Date(startOfWindow + d * DAY_MS);
    buckets.set(day.toISOString().slice(0, 10), { total: 0, failed: 0, succeeded: 0, durations: [] });
  }
  for (const execution of executions ?? []) {
    const startedAt = (execution as { startedAt?: string }).startedAt;
    if (!startedAt) continue;
    const ts = Date.parse(startedAt);
    if (Number.isNaN(ts) || ts < startOfWindow || ts > now) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    const status = (execution as { status?: string }).status;
    if (status === 'failed' || status === 'error' || status === 'cancelled') bucket.failed += 1;
    else if (status === 'succeeded' || status === 'success' || status === 'completed') bucket.succeeded += 1;
    const duration = (execution as { duration?: number | null }).duration;
    if (typeof duration === 'number') bucket.durations.push(duration);
  }
  const points: ExecutionHistoryPoint[] = [...buckets.entries()].map(([bucket, b]) => ({
    bucket,
    total: b.total,
    failed: b.failed,
    succeeded: b.succeeded,
    avgDurationMs: b.durations.length
      ? Math.round(b.durations.reduce((a, c) => a + c, 0) / b.durations.length)
      : null,
  }));
  const totalDurations = points.flatMap((p) => (p.avgDurationMs !== null ? [p.avgDurationMs] : []));
  return {
    workflowId,
    points,
    totals: {
      total: points.reduce((a, p) => a + p.total, 0),
      failed: points.reduce((a, p) => a + p.failed, 0),
      succeeded: points.reduce((a, p) => a + p.succeeded, 0),
      avgDurationMs: totalDurations.length
        ? Math.round(totalDurations.reduce((a, c) => a + c, 0) / totalDurations.length)
        : null,
    },
  };
};
