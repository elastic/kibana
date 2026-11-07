/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlProfileDriver, EsqlProfilePlan, EsqlQueryProfile } from '@kbn/es-types';
import type { QueryResultsSummary } from './compare_results';

const PLANNING_PHASE_IDS = [
  'parsing',
  'view_resolution',
  'dataset_resolution',
  'preanalysis',
  'indices_resolution',
  'enrich_resolution',
  'inference_resolution',
  'analysis',
] as const;

export type PlanningPhaseId = (typeof PLANNING_PHASE_IDS)[number];

export interface PlanningPhase {
  id: PlanningPhaseId;
  tookMillis: number;
}

export interface AggregatedOperatorDriver {
  /** Position of the driver in the profile. Drivers that belong together are listed together. */
  driverIndex: number;
  /** What the driver is for, such as data, final or subplan-0.final. */
  description: string;
  label: string;
  processNanos: number;
  /** False when this operator type reports no time at all, which is not the same as 0 ms. */
  timeReported: boolean;
  rowsReceived: number;
  rowsEmitted: number;
  bytesRead?: number;
  bytesDecoded?: number;
  rawStatus: Record<string, unknown>;
}

export interface AggregatedOperator {
  operator: string;
  title: string;
  detail?: string;
  processNanos: number;
  /** False when no driver reported any time for this operator. */
  timeReported: boolean;
  /** Share of summed process time, from 0 to 1. */
  share: number;
  /**
   * Position in the data driver's pipeline. Operators that only appear on other
   * drivers are appended after that pipeline.
   */
  pipelineIndex: number;
  rowsReceived: number;
  rowsEmitted: number;
  bytesRead?: number;
  bytesDecoded?: number;
  /** Decoded bytes per second. Set only when both decoded bytes and process time are positive. */
  throughputBytesPerSecond?: number;
  /** Decoded bytes divided by stored bytes. */
  expansion?: number;
  drivers: AggregatedOperatorDriver[];
}

/** One operator inside a single driver, in that driver's pipeline order. */
export interface TimelineOperator {
  operator: string;
  title: string;
  detail?: string;
  processNanos: number;
  /** False when this operator reports no time, so it should show a dash instead of 0%. */
  timeReported: boolean;
  /** Share of this driver's summed process time, from 0 to 1. */
  share: number;
  rowsReceived: number;
  rowsEmitted: number;
  rawStatus: Record<string, unknown>;
}

/** Wall-clock span for one driver. Operators are not placed on this clock. */
export interface TimelineDriver {
  id: string;
  description: string;
  nodeName?: string;
  label: string;
  startMillis: number;
  stopMillis: number;
  tookNanos?: number;
  cpuNanos?: number;
  /** Recorded waits inside this driver's span, in start order. */
  sleeps: TimelineSleep[];
  /** Every wait ES counted. It can exceed `sleeps.length` because ES only records a few. */
  sleepCount: number;
  operators: TimelineOperator[];
}

/** One stretch where a driver was waiting, on the same clock as the driver span. */
export interface TimelineSleep {
  reason: string;
  startMillis: number;
  stopMillis: number;
}

export interface TimelinePlanning {
  startMillis: number;
  stopMillis: number;
}

export interface QueryProfileTimeline {
  planning?: TimelinePlanning;
  drivers: TimelineDriver[];
}

export interface QueryProfileView {
  queryTookMillis?: number;
  planningTookMillis?: number;
  executionTookMillis?: number;
  planningPhases: PlanningPhase[];
  driverCount: number;
  operators: AggregatedOperator[];
  plans: EsqlProfilePlan[];
  /** True when at least one driver has a usable start and stop. */
  hasTimeline: boolean;
  timeline: QueryProfileTimeline;
  /** What the profiled run returned. Set by the loader, since the profile does not hold rows. */
  results?: QueryResultsSummary;
}

interface OperatorAccumulator {
  operator: string;
  processNanos: number;
  timeReported: boolean;
  rowsReceived: number;
  rowsEmitted: number;
  bytesRead?: number;
  bytesDecoded?: number;
  drivers: AggregatedOperatorDriver[];
}

/** Shortens `ValuesSourceReaderOperator[fields = [body]]` to a title plus the bracketed detail. */
export function formatOperatorLabel(operator: string): { title: string; detail?: string } {
  const bracketAt = operator.indexOf('[');
  const className = (bracketAt === -1 ? operator : operator.slice(0, bracketAt)).trim();
  const detail = bracketAt === -1 ? undefined : operator.slice(bracketAt).trim();
  const shortened = className.endsWith('Operator')
    ? className.slice(0, -'Operator'.length)
    : className;

  return {
    title: shortened || operator,
    detail: detail || undefined,
  };
}

/** Turns an ES|QL `profile` payload into the summary the query profile view renders. */
export function aggregateEsqlProfile(profile: unknown): QueryProfileView {
  const parsed = parseProfile(profile);
  const queryTookMillis = readTookMillis(parsed?.query);
  const planningTookMillis = readTookMillis(parsed?.planning);
  const executionTookMillis =
    queryTookMillis === undefined || planningTookMillis === undefined
      ? undefined
      : Math.max(0, queryTookMillis - planningTookMillis);

  const drivers = parsed?.drivers ?? [];
  const operators = aggregateOperators(drivers, readPipelineIndex(drivers));
  const timeline = readTimeline(parsed, drivers);

  return {
    queryTookMillis,
    planningTookMillis,
    executionTookMillis,
    planningPhases: readPlanningPhases(parsed),
    driverCount: drivers.length,
    operators,
    plans: (parsed?.plans ?? []).filter(
      (plan) => typeof plan.plan === 'string' && plan.plan.length > 0
    ),
    hasTimeline: timeline.drivers.length > 0,
    timeline,
  };
}

function parseProfile(profile: unknown): EsqlQueryProfile | undefined {
  if (!profile || typeof profile !== 'object') {
    return undefined;
  }
  return profile as EsqlQueryProfile;
}

function readTookMillis(span: { took_millis?: number } | undefined): number | undefined {
  const tookMillis = span?.took_millis;
  return typeof tookMillis === 'number' && Number.isFinite(tookMillis) ? tookMillis : undefined;
}

function readPlanningPhases(profile: EsqlQueryProfile | undefined): PlanningPhase[] {
  if (!profile) {
    return [];
  }

  return PLANNING_PHASE_IDS.flatMap((id) => {
    const tookMillis = readTookMillis(profile[id]);
    return tookMillis === undefined || tookMillis <= 0 ? [] : [{ id, tookMillis }];
  });
}

/**
 * Pipeline order follows the first `data` driver. Other drivers only contribute
 * operators that the data pipeline did not already list.
 */
function readPipelineIndex(drivers: EsqlProfileDriver[]): Map<string, number> {
  const dataDrivers = drivers.filter((driver) => driver.description === 'data');
  const ordered = dataDrivers.length > 0 ? [...dataDrivers, ...drivers] : drivers;
  const index = new Map<string, number>();

  ordered.forEach((driver) => {
    (driver.operators ?? []).forEach((entry) => {
      if (!entry || typeof entry.operator !== 'string' || entry.operator.length === 0) {
        return;
      }
      if (!index.has(entry.operator)) {
        index.set(entry.operator, index.size);
      }
    });
  });

  return index;
}

/**
 * Most operators report `process_nanos`. Aggregation and TopN operators report their time in
 * separate phases instead, so those are summed. Exchange and output operators report no time.
 */
const PHASE_NANOS_FIELDS = ['hash_nanos', 'aggregation_nanos', 'receive_nanos', 'emit_nanos'];

function readOperatorNanos(status: Record<string, unknown>): number | undefined {
  const processNanos = readNumber(status, 'process_nanos');
  if (processNanos !== undefined) {
    return processNanos;
  }
  const phases = PHASE_NANOS_FIELDS.flatMap((field) => readNumber(status, field) ?? []);
  return phases.length > 0 ? phases.reduce((sum, nanos) => sum + nanos, 0) : undefined;
}

function aggregateOperators(
  drivers: EsqlProfileDriver[],
  pipelineIndex: Map<string, number>
): AggregatedOperator[] {
  const byOperator = new Map<string, OperatorAccumulator>();

  drivers.forEach((driver, index) => {
    const label = driverLabel(driver.description, driver.node_name, index);
    (driver.operators ?? []).forEach((entry) => {
      if (!entry || typeof entry.operator !== 'string' || entry.operator.length === 0) {
        return;
      }
      const status = isRecord(entry.status) ? entry.status : {};
      const current: OperatorAccumulator = byOperator.get(entry.operator) ?? {
        operator: entry.operator,
        processNanos: 0,
        timeReported: false,
        rowsReceived: 0,
        rowsEmitted: 0,
        drivers: [],
      };
      const reportedNanos = readOperatorNanos(status);
      const processNanos = reportedNanos ?? 0;
      const rowsReceived = readNumber(status, 'rows_received') ?? 0;
      const rowsEmitted = readNumber(status, 'rows_emitted') ?? 0;
      const bytesRead = readNumber(status, 'bytes_read');
      const bytesDecoded = readNumber(status, 'bytes_decoded');

      current.processNanos += processNanos;
      current.timeReported = current.timeReported || reportedNanos !== undefined;
      current.rowsReceived += rowsReceived;
      current.rowsEmitted += rowsEmitted;
      if (bytesRead !== undefined) {
        current.bytesRead = (current.bytesRead ?? 0) + bytesRead;
      }
      if (bytesDecoded !== undefined) {
        current.bytesDecoded = (current.bytesDecoded ?? 0) + bytesDecoded;
      }
      current.drivers.push({
        driverIndex: index,
        description: driver.description ?? '',
        label,
        processNanos,
        timeReported: reportedNanos !== undefined,
        rowsReceived,
        rowsEmitted,
        bytesRead,
        bytesDecoded,
        rawStatus: status,
      });
      byOperator.set(entry.operator, current);
    });
  });

  const totalProcessNanos = [...byOperator.values()].reduce(
    (sum, operator) => sum + operator.processNanos,
    0
  );

  return [...byOperator.values()]
    .map((operator) =>
      toAggregatedOperator(
        operator,
        totalProcessNanos,
        pipelineIndex.get(operator.operator) ?? pipelineIndex.size
      )
    )
    .sort(
      (left, right) =>
        right.processNanos - left.processNanos || left.pipelineIndex - right.pipelineIndex
    );
}

function toAggregatedOperator(
  operator: OperatorAccumulator,
  totalProcessNanos: number,
  pipelineIndex: number
): AggregatedOperator {
  const { title, detail } = formatOperatorLabel(operator.operator);
  const bytesDecoded = operator.bytesDecoded;
  const bytesRead = operator.bytesRead;
  const hasDecodedBytes = bytesDecoded !== undefined && bytesDecoded > 0;
  const throughputBytesPerSecond =
    hasDecodedBytes && operator.processNanos > 0
      ? (bytesDecoded / operator.processNanos) * 1e9
      : undefined;
  const expansion =
    hasDecodedBytes && bytesRead !== undefined && bytesRead > 0
      ? bytesDecoded / bytesRead
      : undefined;

  return {
    operator: operator.operator,
    title,
    detail,
    processNanos: operator.processNanos,
    timeReported: operator.timeReported,
    share: totalProcessNanos > 0 ? operator.processNanos / totalProcessNanos : 0,
    pipelineIndex,
    rowsReceived: operator.rowsReceived,
    rowsEmitted: operator.rowsEmitted,
    bytesRead: hasDecodedBytes ? bytesRead : undefined,
    bytesDecoded: hasDecodedBytes ? bytesDecoded : undefined,
    throughputBytesPerSecond,
    expansion,
    drivers: operator.drivers,
  };
}

function readTimeline(
  profile: EsqlQueryProfile | undefined,
  drivers: EsqlProfileDriver[]
): QueryProfileTimeline {
  const planning = readClock(profile?.planning?.start_millis, profile?.planning?.stop_millis);
  const timelineDrivers = drivers.flatMap((driver, index) => {
    const clock = readClock(driver.start_millis, driver.stop_millis);
    if (!clock) {
      return [];
    }

    return [
      {
        id: String(index),
        description: driver.description ?? '',
        nodeName: driver.node_name,
        label: driverLabel(driver.description, driver.node_name, index),
        ...clock,
        tookNanos: readFinite(driver.took_nanos),
        cpuNanos: readFinite(driver.cpu_nanos),
        sleeps: readSleeps(driver, clock),
        sleepCount: countSleeps(driver),
        operators: readDriverOperators(driver),
      },
    ];
  });

  return {
    ...(planning ? { planning } : {}),
    drivers: timelineDrivers,
  };
}

/**
 * ES keeps only the first and last few sleeps, and they overlap when there are few of them.
 * Sleeps are merged, de-duplicated and clipped to the driver's own span.
 */
function readSleeps(
  driver: EsqlProfileDriver,
  clock: { startMillis: number; stopMillis: number }
): TimelineSleep[] {
  const recorded = [...(driver.sleeps?.first ?? []), ...(driver.sleeps?.last ?? [])];
  const seen = new Set<string>();

  return recorded
    .flatMap((sleep) => {
      const start = readFinite(sleep?.sleep_millis);
      const wake = readFinite(sleep?.wake_millis);
      if (start === undefined || wake === undefined) {
        return [];
      }
      const startMillis = Math.max(start, clock.startMillis);
      const stopMillis = Math.min(wake, clock.stopMillis);
      const key = `${sleep.thread_name ?? ''}|${start}|${wake}`;
      if (stopMillis <= startMillis || seen.has(key)) {
        return [];
      }
      seen.add(key);
      return [{ reason: sleep.reason ?? '', startMillis, stopMillis }];
    })
    .sort((left, right) => left.startMillis - right.startMillis);
}

function countSleeps(driver: EsqlProfileDriver): number {
  return Object.values(driver.sleeps?.counts ?? {}).reduce(
    (sum: number, count) =>
      typeof count === 'number' && Number.isFinite(count) ? sum + count : sum,
    0
  );
}

/** Operators stay in the driver's own order. Share is of this driver only. */
function readDriverOperators(driver: EsqlProfileDriver): TimelineOperator[] {
  const operators = (driver.operators ?? []).flatMap((entry) => {
    if (!entry || typeof entry.operator !== 'string' || entry.operator.length === 0) {
      return [];
    }
    const status = isRecord(entry.status) ? entry.status : {};
    const reportedNanos = readOperatorNanos(status);
    return [
      {
        operator: entry.operator,
        processNanos: reportedNanos ?? 0,
        timeReported: reportedNanos !== undefined,
        rowsReceived: readNumber(status, 'rows_received') ?? 0,
        rowsEmitted: readNumber(status, 'rows_emitted') ?? 0,
        rawStatus: status,
      },
    ];
  });
  const totalProcessNanos = operators.reduce((sum, operator) => sum + operator.processNanos, 0);

  return operators.map((operator) => {
    const { title, detail } = formatOperatorLabel(operator.operator);
    return {
      ...operator,
      title,
      detail,
      share: totalProcessNanos > 0 ? operator.processNanos / totalProcessNanos : 0,
    };
  });
}

function readClock(
  start: number | undefined,
  stop: number | undefined
): { startMillis: number; stopMillis: number } | undefined {
  const startMillis = readFinite(start);
  const stopMillis = readFinite(stop);
  if (startMillis === undefined || stopMillis === undefined || stopMillis < startMillis) {
    return undefined;
  }
  return { startMillis, stopMillis };
}

function readFinite(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function driverLabel(
  description: string | undefined,
  nodeName: string | undefined,
  index: number
): string {
  const parts = [description, nodeName].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : String(index + 1);
}

function readNumber(status: Record<string, unknown>, key: string): number | undefined {
  const value = status[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
