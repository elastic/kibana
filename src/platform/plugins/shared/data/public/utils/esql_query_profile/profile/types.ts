/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { esqlProfileResponseSchema } from '@elastic/esql-definitions/profile-schema';
import type { EsqlProfilePlan } from '@kbn/es-types';

type SchemaProperties = typeof esqlProfileResponseSchema.properties;

/** The top-level properties of the profile that are a time span, as the schema describes them. */
type TimeSpanProperty = {
  [Name in keyof SchemaProperties]: SchemaProperties[Name] extends {
    readonly anyOf: readonly [
      { readonly properties: { readonly took_millis: unknown } },
      ...unknown[]
    ];
  }
    ? Name
    : never;
}[keyof SchemaProperties];

/** The phases of planning, such as parsing and analysis. `query` and `planning` are their totals. */
export type PlanningPhaseId = Exclude<TimeSpanProperty, 'query' | 'planning'>;

export interface PlanningPhase {
  id: PlanningPhaseId;
  tookMillis: number;
}

/** A stretch of the wall clock, in epoch milliseconds. */
export interface TimeSpan {
  startMillis: number;
  stopMillis: number;
}

/** What an operator reported: its time and its rows. */
export interface OperatorMeasures {
  processNanos: number;
  /** False when no time was reported at all, which is not the same as 0 ms. */
  timeReported: boolean;
  rowsReceived: number;
  rowsEmitted: number;
}

/** How an operator is shown: a short title, and the bracketed detail of its description. */
interface OperatorName {
  title: string;
  detail?: string;
}

/** One operator as it ran in one driver. */
export interface AggregatedOperatorDriver {
  /** The node the driver ran on. Plan node ids only mean something together with it. */
  nodeName?: string;
  /** The id of the plan node the operator was built from, when ES reports it. */
  planNodeId?: string;
  processNanos: number;
  timeReported: boolean;
}

/** Where in the query a plan node came from. */
export interface PlanNodeSource {
  /** Line and column of the command in the query, counting from 1. */
  line: number;
  column: number;
  /** The command as ES saw it. */
  text: string;
}

/** One kind of operator, summed over all the drivers it ran in. */
export interface AggregatedOperator extends OperatorName, OperatorMeasures {
  /** Share of summed process time, from 0 to 1. */
  share: number;
  drivers: AggregatedOperatorDriver[];
}

/** One operator inside a single driver, in that driver's pipeline order. */
export interface TimelineOperator extends OperatorName, OperatorMeasures {
  /** The operator as ES describes it, with its detail. */
  operator: string;
  /** Share of this driver's summed process time, from 0 to 1. */
  share: number;
  rawStatus: Record<string, unknown>;
}

/** One stretch where a driver was waiting, on the same clock as the driver span. */
export interface TimelineSleep extends TimeSpan {
  reason: string;
}

/** Wall-clock span for one driver. Operators are not placed on this clock. */
export interface TimelineDriver extends TimeSpan {
  id: string;
  description: string;
  nodeName?: string;
  label: string;
  cpuNanos?: number;
  /** Recorded waits inside this driver's span, in start order. */
  sleeps: TimelineSleep[];
  /** Time spent in the recorded waits. ES records only some of them, so this can be too low. */
  waitedMillis: number;
  /** Every wait ES counted. It can exceed `sleeps.length` because ES only records a few. */
  sleepCount: number;
  operators: TimelineOperator[];
}

export interface QueryProfileTimeline {
  planning?: TimeSpan;
  drivers: TimelineDriver[];
}

/** What is kept of a result set so two runs can be compared without holding every row. */
export interface QueryResultsSummary {
  /** The name and type of every column, since the same values in another type are another result. */
  columns: Array<{ name: string; type: string }>;
  rowCount: number;
  /** Fingerprint of the rows, ignoring their order. */
  rowsFingerprint: string;
  /** Fingerprint of the rows in the order they came back. */
  orderedFingerprint: string;
}

export interface QueryProfileView {
  queryTookMillis?: number;
  planningTookMillis?: number;
  executionTookMillis?: number;
  planningPhases: PlanningPhase[];
  driverCount: number;
  operators: AggregatedOperator[];
  plans: EsqlProfilePlan[];
  /** The source of each plan node that has one, by `planNodeKey` of its node and id. */
  planNodeSources: Record<string, PlanNodeSource>;
  /** True when at least one driver has a usable start and stop. */
  hasTimeline: boolean;
  timeline: QueryProfileTimeline;
  /** What the profiled run returned. Set by the loader, since the profile does not hold rows. */
  results?: QueryResultsSummary;
}
