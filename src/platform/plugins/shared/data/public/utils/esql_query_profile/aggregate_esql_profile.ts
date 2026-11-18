/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlProfileDriver, EsqlQueryProfile } from '@kbn/es-types';
import type {
  AggregatedOperator,
  AggregatedOperatorDriver,
  OperatorMeasures,
  PlanningPhase,
  QueryProfileTimeline,
  QueryProfileView,
  TimelineOperator,
  TimelineSleep,
  TimeSpan,
} from './types';
import { PHASE_NANOS_FIELDS, PLANNING_PHASE_IDS, PROCESS_NANOS_FIELD } from './profile_schema';
import { isRecord } from './json_helpers';
import { readPlanNodeSources } from './plan_node_sources';
import { spanMillis } from './timeline_layout';

interface OperatorAccumulator extends OperatorMeasures {
  operator: string;
  drivers: AggregatedOperatorDriver[];
}

/** Shortens `ValuesSourceReaderOperator[fields = [body]]` to a title plus the bracketed detail. */
function formatOperatorLabel(operator: string): { title: string; detail?: string } {
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
  const readings = drivers.map(readOperatorReadings);
  const operators = aggregateOperators(drivers, readings);
  const timeline = readTimeline(parsed, drivers, readings);

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
    planNodeSources: readPlanNodeSources(parsed?.plans ?? []),
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

function readTookMillis(span: { took_millis?: number } | null | undefined): number | undefined {
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

/** What one operator of a driver reported, with its time and rows read out of its status. */
interface OperatorReading extends OperatorMeasures {
  operator: string;
  planNodeId?: string;
  rawStatus: Record<string, unknown>;
}

/** The operators of a driver in its own order. An entry without a name is skipped. */
function readOperatorReadings(driver: EsqlProfileDriver): OperatorReading[] {
  return (driver.operators ?? []).flatMap((entry) => {
    if (!entry || typeof entry.operator !== 'string' || entry.operator.length === 0) {
      return [];
    }
    const status = isRecord(entry.status) ? entry.status : {};
    const reportedNanos = readOperatorNanos(status);
    return [
      {
        operator: entry.operator,
        planNodeId: entry.plan_node_id,
        processNanos: reportedNanos ?? 0,
        timeReported: reportedNanos !== undefined,
        rowsReceived: readFinite(status.rows_received) ?? 0,
        rowsEmitted: readFinite(status.rows_emitted) ?? 0,
        rawStatus: status,
      },
    ];
  });
}

function readOperatorNanos(status: Record<string, unknown>): number | undefined {
  const processNanos = readFinite(status[PROCESS_NANOS_FIELD]);
  if (processNanos !== undefined) {
    return processNanos;
  }
  const phases = PHASE_NANOS_FIELDS.flatMap((field) => readFinite(status[field]) ?? []);
  return phases.length > 0 ? phases.reduce((sum, nanos) => sum + nanos, 0) : undefined;
}

function aggregateOperators(
  drivers: EsqlProfileDriver[],
  readingsByDriver: OperatorReading[][]
): AggregatedOperator[] {
  const byOperator = new Map<string, OperatorAccumulator>();

  readingsByDriver.forEach((readings, index) => {
    readings.forEach(({ operator, ...reading }) => {
      const current: OperatorAccumulator = byOperator.get(operator) ?? {
        operator,
        processNanos: 0,
        timeReported: false,
        rowsReceived: 0,
        rowsEmitted: 0,
        drivers: [],
      };

      current.processNanos += reading.processNanos;
      current.timeReported = current.timeReported || reading.timeReported;
      current.rowsReceived += reading.rowsReceived;
      current.rowsEmitted += reading.rowsEmitted;
      current.drivers.push({
        driverIndex: index,
        nodeName: drivers[index].node_name,
        planNodeId: reading.planNodeId,
        processNanos: reading.processNanos,
        timeReported: reading.timeReported,
      });
      byOperator.set(operator, current);
    });
  });

  const totalProcessNanos = [...byOperator.values()].reduce(
    (sum, operator) => sum + operator.processNanos,
    0
  );

  return [...byOperator.values()]
    .map((operator) => toAggregatedOperator(operator, totalProcessNanos))
    .sort((left, right) => right.processNanos - left.processNanos);
}

function toAggregatedOperator(
  operator: OperatorAccumulator,
  totalProcessNanos: number
): AggregatedOperator {
  return {
    ...formatOperatorLabel(operator.operator),
    processNanos: operator.processNanos,
    timeReported: operator.timeReported,
    share: shareOf(operator.processNanos, totalProcessNanos),
    rowsReceived: operator.rowsReceived,
    rowsEmitted: operator.rowsEmitted,
    drivers: operator.drivers,
  };
}

function readTimeline(
  profile: EsqlQueryProfile | undefined,
  drivers: EsqlProfileDriver[],
  readingsByDriver: OperatorReading[][]
): QueryProfileTimeline {
  const planning = readClock(profile?.planning?.start_millis, profile?.planning?.stop_millis);
  const timelineDrivers = drivers.flatMap((driver, index) => {
    const clock = readClock(driver.start_millis, driver.stop_millis);
    if (!clock) {
      return [];
    }
    const sleeps = readSleeps(driver, clock);

    return [
      {
        id: String(index),
        description: driver.description ?? '',
        nodeName: driver.node_name,
        label: driverLabel(driver.description, driver.node_name, index),
        ...clock,
        cpuNanos: readFinite(driver.cpu_nanos),
        sleeps,
        waitedMillis: sleeps.reduce((sum, sleep) => sum + spanMillis(sleep), 0),
        sleepCount: countSleeps(driver),
        operators: readDriverOperators(readingsByDriver[index]),
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
function readSleeps(driver: EsqlProfileDriver, clock: TimeSpan): TimelineSleep[] {
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
function readDriverOperators(readings: OperatorReading[]): TimelineOperator[] {
  const totalProcessNanos = readings.reduce((sum, reading) => sum + reading.processNanos, 0);

  return readings.map(({ planNodeId, ...reading }) => ({
    ...reading,
    ...formatOperatorLabel(reading.operator),
    share: shareOf(reading.processNanos, totalProcessNanos),
  }));
}

/** A part of a total, from 0 to 1, with no total meaning no share. */
export function shareOf(nanos: number, totalNanos: number): number {
  return totalNanos > 0 ? nanos / totalNanos : 0;
}

function readClock(start: number | undefined, stop: number | undefined): TimeSpan | undefined {
  const startMillis = readFinite(start);
  const stopMillis = readFinite(stop);
  if (startMillis === undefined || stopMillis === undefined || stopMillis < startMillis) {
    return undefined;
  }
  return { startMillis, stopMillis };
}

function readFinite(value: unknown): number | undefined {
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
