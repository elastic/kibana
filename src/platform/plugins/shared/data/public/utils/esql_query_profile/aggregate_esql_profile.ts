/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlProfileDriver, EsqlProfilePlan, EsqlQueryProfile } from '@kbn/es-types';

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
  label: string;
  processNanos: number;
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
  operators: TimelineOperator[];
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
}

interface OperatorAccumulator {
  operator: string;
  processNanos: number;
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
        rowsReceived: 0,
        rowsEmitted: 0,
        drivers: [],
      };
      const processNanos = readNumber(status, 'process_nanos') ?? 0;
      const rowsReceived = readNumber(status, 'rows_received') ?? 0;
      const rowsEmitted = readNumber(status, 'rows_emitted') ?? 0;
      const bytesRead = readNumber(status, 'bytes_read');
      const bytesDecoded = readNumber(status, 'bytes_decoded');

      current.processNanos += processNanos;
      current.rowsReceived += rowsReceived;
      current.rowsEmitted += rowsEmitted;
      if (bytesRead !== undefined) {
        current.bytesRead = (current.bytesRead ?? 0) + bytesRead;
      }
      if (bytesDecoded !== undefined) {
        current.bytesDecoded = (current.bytesDecoded ?? 0) + bytesDecoded;
      }
      current.drivers.push({
        label,
        processNanos,
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
        operators: readDriverOperators(driver),
      },
    ];
  });

  return {
    ...(planning ? { planning } : {}),
    drivers: timelineDrivers,
  };
}

/** Operators stay in the driver's own order. Share is of this driver only. */
function readDriverOperators(driver: EsqlProfileDriver): TimelineOperator[] {
  const operators = (driver.operators ?? []).flatMap((entry) => {
    if (!entry || typeof entry.operator !== 'string' || entry.operator.length === 0) {
      return [];
    }
    const status = isRecord(entry.status) ? entry.status : {};
    return [
      {
        operator: entry.operator,
        processNanos: readNumber(status, 'process_nanos') ?? 0,
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
