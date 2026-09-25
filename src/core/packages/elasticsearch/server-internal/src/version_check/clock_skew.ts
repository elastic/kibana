/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Kibana/Elasticsearch clock skew check as a state-action machine: checked
 * every ten minutes, logged on detection, hourly while skewed, and on recovery.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { HEALTH_CHECK_REQUEST_TIMEOUT } from './constants';
import {
  nextOnGrid,
  realClock,
  run,
  type Action,
  type ActionResult,
  type AugmentedState,
  type Clock,
  type InitialEvent,
  type Scheduled,
  type StateActionMachine,
} from './state_action_machine';

const MAX_CLOCK_SKEW_MS = 60_000;
const CLOCK_SKEW_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_REMINDER_INTERVAL_MS = 60 * 60 * 1000;

/** Each node's `timestamp`, bracketed by Kibana's wall clock around the request. */
export interface ClockSkewSample {
  readonly requestedAt: number;
  readonly respondedAt: number;
  readonly timestamps: number[];
}

export interface ClockSkew {
  readonly ms: number;
  readonly kibanaTime: number;
  readonly elasticsearchTime: number;
}

export type ClockSkewClassification =
  | { readonly type: 'unmeasured' }
  | { readonly type: 'inSync' }
  | { readonly type: 'skewed'; readonly skew: ClockSkew };

export type ClockSkewState = Scheduled &
  (
    | { readonly controlState: 'healthy' }
    | { readonly controlState: 'skewed'; readonly remindAt: number }
  );

export type ClockSkewEvent =
  /** The request failed or measured nothing. */
  | { readonly type: 'unavailable' }
  | { readonly type: 'inSync' }
  | { readonly type: 'recovered' }
  | { readonly type: 'skewDetected'; readonly skew: ClockSkew }
  /** Still skewed; the hourly reminder is not yet due. */
  | { readonly type: 'skewPersists' }
  | { readonly type: 'skewReminder'; readonly skew: ClockSkew };

export const initialState = (nextActionAt: number): ClockSkewState => ({
  controlState: 'healthy',
  nextActionAt,
});

export const sampleClocks =
  (internalClient: ElasticsearchClient): Action<ClockSkewSample> =>
  async (signal) => {
    const requestedAt = Date.now();
    const { nodes } = await internalClient.nodes.stats(
      { node_id: '_all', metric: 'os', filter_path: ['nodes.*.timestamp'] },
      { requestTimeout: HEALTH_CHECK_REQUEST_TIMEOUT, signal }
    );
    const respondedAt = Date.now();
    const timestamps = Object.values(nodes).flatMap(({ timestamp }) =>
      timestamp === undefined ? [] : [timestamp]
    );
    return { requestedAt, respondedAt, timestamps };
  };

/**
 * A node is skewed when its clock is more than the tolerance outside the round
 * trip, so latency can't cause it; the reported skew is a lower bound.
 */
export const classifyClockSkew = ({
  requestedAt,
  respondedAt,
  timestamps,
}: ClockSkewSample): ClockSkewClassification => {
  if (timestamps.length === 0) {
    return { type: 'unmeasured' };
  }
  const elasticsearchTime = timestamps.find(
    (timestamp) =>
      requestedAt - timestamp > MAX_CLOCK_SKEW_MS || timestamp - respondedAt > MAX_CLOCK_SKEW_MS
  );
  if (elasticsearchTime === undefined) {
    return { type: 'inSync' };
  }
  const kibanaTime = Math.min(respondedAt, Math.max(requestedAt, elasticsearchTime));
  return {
    type: 'skewed',
    skew: { ms: Math.abs(kibanaTime - elasticsearchTime), kibanaTime, elasticsearchTime },
  };
};

export const model = (
  state: ClockSkewState,
  result: ActionResult<ClockSkewSample>
): AugmentedState<ClockSkewState, ClockSkewEvent> => {
  const nextActionAt = nextOnGrid(
    state.nextActionAt,
    result.completedAt,
    CLOCK_SKEW_CHECK_INTERVAL_MS
  );
  const unavailable: AugmentedState<ClockSkewState, ClockSkewEvent> = {
    state: { ...state, nextActionAt },
    event: { type: 'unavailable' },
  };

  if (!result.ok) {
    return unavailable;
  }
  const classification = classifyClockSkew(result.value);
  if (classification.type === 'unmeasured') {
    return unavailable;
  }
  if (classification.type === 'inSync') {
    return {
      state: { controlState: 'healthy', nextActionAt },
      event: { type: state.controlState === 'skewed' ? 'recovered' : 'inSync' },
    };
  }

  const { skew } = classification;
  const remindAt = result.completedAt + CLOCK_SKEW_REMINDER_INTERVAL_MS;
  if (state.controlState === 'healthy') {
    return {
      state: { controlState: 'skewed', remindAt, nextActionAt },
      event: { type: 'skewDetected', skew },
    };
  }
  if (result.completedAt < state.remindAt) {
    return { state: { ...state, nextActionAt }, event: { type: 'skewPersists' } };
  }
  return {
    state: { controlState: 'skewed', remindAt, nextActionAt },
    event: { type: 'skewReminder', skew },
  };
};

export const clockSkewMachine = (
  action: Action<ClockSkewSample>
): StateActionMachine<ClockSkewState, ClockSkewSample, ClockSkewEvent> => ({
  initialState,
  next: () => action,
  model,
});

const describeSkew = (still: '' | 'still ', { ms, kibanaTime, elasticsearchTime }: ClockSkew) =>
  `Kibana and Elasticsearch clocks are ${still}out of sync by at least ${ms}ms. Kibana time: ${new Date(
    kibanaTime
  ).toISOString()}; Elasticsearch time: ${new Date(elasticsearchTime).toISOString()}.`;

export const logClockSkewEvent = (log: Logger, event: ClockSkewEvent | InitialEvent): void => {
  switch (event.type) {
    case 'initial':
    case 'unavailable':
    case 'inSync':
    case 'skewPersists':
      return;
    case 'recovered':
      log.info('Kibana and Elasticsearch clocks are in sync again.');
      return;
    case 'skewDetected':
      log.error(describeSkew('', event.skew));
      return;
    case 'skewReminder':
      log.error(describeSkew('still ', event.skew));
      return;
  }
};

export interface PollEsNodesClockSkewOptions {
  internalClient: ElasticsearchClient;
  log: Logger;
  signal: AbortSignal;
}

/** Runs the clock skew check, logging its events, until `signal` aborts. */
export const pollEsNodesClockSkew = async (
  { internalClient, log, signal }: PollEsNodesClockSkewOptions,
  clock: Clock = realClock
): Promise<void> => {
  const machine = clockSkewMachine(sampleClocks(internalClient));
  for await (const { event } of run(machine, clock, signal)) {
    logClockSkewEvent(log, event);
  }
};
