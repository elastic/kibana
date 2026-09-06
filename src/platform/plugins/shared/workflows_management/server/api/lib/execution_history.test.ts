/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Under the Elastic License 2.0, the
 * GNU AGPLv3, or the SSPLv1, at your election.
 */
import { aggregateExecutionHistory } from './execution_history';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() - offsetDays * DAY).toISOString();

describe('aggregateExecutionHistory (WF-007)', () => {
  it('buckets executions by day with status counts and avg duration', () => {
    const executions = [
      { startedAt: iso(1), status: 'succeeded', duration: 100 },
      { startedAt: iso(1), status: 'failed', duration: 300 },
      { startedAt: iso(2), status: 'succeeded', duration: 200 },
    ];
    const summary = aggregateExecutionHistory('wf1', executions as any, 7);
    expect(summary.points).toHaveLength(7);
    const yesterday = summary.points.find((p) => p.bucket === iso(1).slice(0, 10))!;
    expect(yesterday.total).toBe(2);
    expect(yesterday.failed).toBe(1);
    expect(yesterday.succeeded).toBe(1);
    expect(yesterday.avgDurationMs).toBe(200);
    expect(summary.totals).toEqual({ total: 3, failed: 1, succeeded: 2, avgDurationMs: 200 });
  });

  it('ignores executions outside the window and malformed timestamps', () => {
    const executions = [
      { startedAt: iso(40), status: 'succeeded', duration: 1 },
      { startedAt: 'not-a-date', status: 'succeeded', duration: 1 },
      { startedAt: iso(1), status: 'succeeded', duration: 10 },
    ];
    const summary = aggregateExecutionHistory('wf1', executions as any, 7);
    expect(summary.totals.total).toBe(1);
  });

  it('handles empty and undefined execution lists', () => {
    expect(aggregateExecutionHistory('wf1', [], 3).totals.total).toBe(0);
    expect(aggregateExecutionHistory('wf1', undefined as any, 3).totals.total).toBe(0);
  });

  it('treats error and cancelled as failures', () => {
    const executions = [
      { startedAt: iso(1), status: 'error', duration: 5 },
      { startedAt: iso(2), status: 'cancelled', duration: 5 },
    ];
    const summary = aggregateExecutionHistory('wf1', executions as any, 2);
    expect(summary.totals.failed).toBe(2);
    expect(summary.totals.avgDurationMs).toBe(5);
  });
});
