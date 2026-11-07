/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregatedOperator, QueryProfileView } from './aggregate_esql_profile';
import { findCriticalPath, findStraggler } from './critical_path';
import { OPERATOR_CATEGORIES, operatorCategory } from './operator_icon';
import type { OperatorCategory } from './operator_icon';

const MAX_INSIGHTS = 5;

/** Below this much operator CPU time, shares are noise and nothing is worth pointing at. */
const MIN_TOTAL_CPU_NANOS = 1_000_000;
const DOMINANT_SHARE = 0.5;
const MIN_WAIT_SPAN_MILLIS = 10;
const WAIT_SHARE = 0.5;
const MIN_READ_DECODED_BYTES = 10_000_000;
const MIN_READ_EXPANSION = 8;
const MIN_FILTER_INPUT_ROWS = 10_000;
const MAX_FILTER_KEPT_RATIO = 0.1;
const MIN_PLANNING_MILLIS = 20;
const PLANNING_SHARE = 0.3;
const MIN_SKEW_DRIVERS = 3;
const MIN_SKEW_MILLIS = 20;
const SKEW_RATIO = 2;

export type ProfileInsight =
  | { kind: 'dominantOperator'; severity: 'warning'; title: string; share: number }
  | {
      kind: 'driverWait';
      severity: 'info';
      driver: string;
      share: number;
      /** True when ES counted more waits than it recorded, so the real share can only be higher. */
      atLeast: boolean;
      reason: string;
    }
  | {
      kind: 'readExpansion';
      severity: 'info';
      title: string;
      storedBytes: number;
      decodedBytes: number;
      expansion: number;
    }
  | { kind: 'lateFilter'; severity: 'info'; title: string; rowsIn: number; rowsOut: number }
  | { kind: 'planningHeavy'; severity: 'warning'; share: number; planningMillis: number }
  | {
      kind: 'straggler';
      severity: 'warning';
      /** What kind of driver it is, such as data. */
      description: string;
      /** How long after the typical driver of its kind it finished. */
      lagMillis: number;
      /** When it started, from the start of the first driver. */
      startMillis: number;
      /** True when it started about when its peers finished, so it was likely waiting for a thread. */
      startedLate: boolean;
    }
  | {
      kind: 'driverSkew';
      severity: 'warning';
      description: string;
      slowestMillis: number;
      medianMillis: number;
    };

export interface CpuBreakdownEntry {
  category: OperatorCategory;
  nanos: number;
  /** Share of all operator CPU time that reported a time, from 0 to 1. */
  share: number;
}

/** Operator CPU time grouped by kind of work. Operators that report no time are left out. */
export function summarizeCpuByCategory(operators: AggregatedOperator[]): CpuBreakdownEntry[] {
  const totals = new Map<OperatorCategory, number>();
  operators.forEach((operator) => {
    if (!operator.timeReported) {
      return;
    }
    const category = operatorCategory(operator.title);
    totals.set(category, (totals.get(category) ?? 0) + operator.processNanos);
  });

  const total = [...totals.values()].reduce((sum, nanos) => sum + nanos, 0);
  if (total <= 0) {
    return [];
  }

  return OPERATOR_CATEGORIES.flatMap((category) => {
    const nanos = totals.get(category) ?? 0;
    return nanos > 0 ? [{ category, nanos, share: nanos / total }] : [];
  });
}

/** Plain rules over a profile. Each one names something measurable, and none gives advice. */
export function deriveInsights(view: QueryProfileView): ProfileInsight[] {
  const insights = [
    ...dominantOperator(view),
    ...straggler(view),
    ...planningHeavy(view),
    ...driverSkew(view),
    ...driverWaits(view),
    ...readExpansion(view),
    ...lateFilters(view),
  ];

  // A straggler says it better than a slow driver among its peers, so the second is left out.
  const hasStraggler = insights.some((insight) => insight.kind === 'straggler');
  const warnings = insights.filter(
    (insight) => insight.severity === 'warning' && !(hasStraggler && insight.kind === 'driverSkew')
  );
  const info = insights.filter((insight) => insight.severity === 'info');
  return [...warnings, ...info].slice(0, MAX_INSIGHTS);
}

function dominantOperator(view: QueryProfileView): ProfileInsight[] {
  const timed = view.operators.filter((operator) => operator.timeReported);
  const total = timed.reduce((sum, operator) => sum + operator.processNanos, 0);
  if (timed.length < 2 || total < MIN_TOTAL_CPU_NANOS) {
    return [];
  }

  const top = timed.reduce((best, operator) =>
    operator.processNanos > best.processNanos ? operator : best
  );
  const share = top.processNanos / total;
  return share >= DOMINANT_SHARE
    ? [{ kind: 'dominantOperator', severity: 'warning', title: top.title, share }]
    : [];
}

/**
 * The query waited for one driver while the others of its kind sat done. Speeding up the others
 * would not have made the query faster.
 */
function straggler(view: QueryProfileView): ProfileInsight[] {
  const path = findCriticalPath(view);
  const slow = path && findStraggler(view, path);
  const driver = slow && view.timeline.drivers.find((candidate) => candidate.id === slow.driverId);
  return slow && driver
    ? [
        {
          kind: 'straggler',
          severity: 'warning',
          description: driver.description || 'driver',
          lagMillis: slow.lagMillis,
          startMillis: slow.startMillis,
          startedLate: slow.startedLate,
        },
      ]
    : [];
}

function planningHeavy(view: QueryProfileView): ProfileInsight[] {
  const { planningTookMillis, queryTookMillis } = view;
  if (
    planningTookMillis === undefined ||
    queryTookMillis === undefined ||
    queryTookMillis <= 0 ||
    planningTookMillis < MIN_PLANNING_MILLIS
  ) {
    return [];
  }

  const share = planningTookMillis / queryTookMillis;
  return share >= PLANNING_SHARE
    ? [{ kind: 'planningHeavy', severity: 'warning', share, planningMillis: planningTookMillis }]
    : [];
}

function driverSkew(view: QueryProfileView): ProfileInsight[] {
  const byDescription = new Map<string, number[]>();
  view.timeline.drivers.forEach((driver) => {
    const durations = byDescription.get(driver.description) ?? [];
    durations.push(driver.stopMillis - driver.startMillis);
    byDescription.set(driver.description, durations);
  });

  return [...byDescription.entries()].flatMap(([description, durations]) => {
    if (durations.length < MIN_SKEW_DRIVERS) {
      return [];
    }
    const sorted = [...durations].sort((left, right) => left - right);
    const slowestMillis = sorted[sorted.length - 1];
    const medianMillis = sorted[Math.floor(sorted.length / 2)];
    return slowestMillis >= MIN_SKEW_MILLIS && slowestMillis >= medianMillis * SKEW_RATIO
      ? [
          {
            kind: 'driverSkew' as const,
            severity: 'warning' as const,
            description,
            slowestMillis,
            medianMillis,
          },
        ]
      : [];
  });
}

function driverWaits(view: QueryProfileView): ProfileInsight[] {
  return view.timeline.drivers.flatMap((driver) => {
    const span = driver.stopMillis - driver.startMillis;
    if (span < MIN_WAIT_SPAN_MILLIS || driver.sleeps.length === 0) {
      return [];
    }

    const waited = driver.sleeps.reduce(
      (sum, sleep) => sum + (sleep.stopMillis - sleep.startMillis),
      0
    );
    const share = Math.min(waited / span, 1);
    if (share < WAIT_SHARE) {
      return [];
    }

    return [
      {
        kind: 'driverWait' as const,
        severity: 'info' as const,
        driver: driver.nodeName ? `${driver.description} · ${driver.nodeName}` : driver.label,
        share,
        atLeast: driver.sleepCount > driver.sleeps.length,
        reason: mostCommonReason(driver.sleeps.map((sleep) => sleep.reason)),
      },
    ];
  });
}

function mostCommonReason(reasons: string[]): string {
  const counts = new Map<string, number>();
  reasons.filter(Boolean).forEach((reason) => counts.set(reason, (counts.get(reason) ?? 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
}

function readExpansion(view: QueryProfileView): ProfileInsight[] {
  return view.operators.flatMap((operator) =>
    operator.expansion !== undefined &&
    operator.bytesRead !== undefined &&
    operator.bytesDecoded !== undefined &&
    operator.bytesDecoded >= MIN_READ_DECODED_BYTES &&
    operator.expansion >= MIN_READ_EXPANSION
      ? [
          {
            kind: 'readExpansion' as const,
            severity: 'info' as const,
            title: operator.title,
            storedBytes: operator.bytesRead,
            decodedBytes: operator.bytesDecoded,
            expansion: operator.expansion,
          },
        ]
      : []
  );
}

function lateFilters(view: QueryProfileView): ProfileInsight[] {
  return view.operators.flatMap((operator) =>
    operator.title.toLowerCase().includes('filter') &&
    operator.rowsReceived >= MIN_FILTER_INPUT_ROWS &&
    operator.rowsEmitted / operator.rowsReceived <= MAX_FILTER_KEPT_RATIO
      ? [
          {
            kind: 'lateFilter' as const,
            severity: 'info' as const,
            title: operator.title,
            rowsIn: operator.rowsReceived,
            rowsOut: operator.rowsEmitted,
          },
        ]
      : []
  );
}
