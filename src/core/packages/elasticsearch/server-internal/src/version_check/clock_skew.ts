/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Kibana/Elasticsearch clock skew check as a state-action machine. This
 * module is the domain only: its state, its one action, and its model:
 *
 *   state   `ClockSkewState` and `initialState`; the control state selects the
 *           polling interval: healthy checks every ten minutes, skewed reminds
 *           every hour
 *   action  `sampleClocks`: one node stats request, bracketed by Kibana's wall
 *           clock, returning a `ClockSkewSample`
 *   model   `model`: classifies the sample, and says what the step meant as a
 *           `ClockSkewEvent`
 *
 * `clockSkewMachine` bundles them for the driver; its `next` always returns
 * the one action, since there is only one.
 *
 * Two clocks, kept apart: the driver schedules on a monotonic clock, while the
 * skew itself is measured on the wall clock, which the action reads before and
 * after the round trip and returns as data. The model never reads either.
 *
 * The event is the domain's account of the transition: whether the skew was
 * detected, persists, or cleared. Only the model has both the state it left
 * and the state it reached, so that judgement is made here, once. Presenting
 * an event is the logger's concern.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { HEALTH_CHECK_REQUEST_TIMEOUT } from './constants';
import {
  nextOnGrid,
  run,
  realClock,
  type Action,
  type AugmentedState,
  type Clock,
  type InitialEvent,
  type StateActionMachine,
  type ActionResult,
  type Scheduled,
} from './state_action_machine';

const MAX_CLOCK_SKEW_MS = 60_000;
const CLOCK_SKEW_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const CLOCK_SKEW_REMINDER_INTERVAL_MS = 60 * 60 * 1000;

/** What one node stats request returned, bracketed by Kibana's wall clock. */
export interface ClockSkewSample {
  /** Kibana wall-clock time just before the request was sent. */
  readonly requestedAt: number;
  /** Kibana wall-clock time just after the response arrived. */
  readonly respondedAt: number;
  /** The `timestamp` each Elasticsearch node reported. */
  readonly timestamps: number[];
}

/** A skew that the round trip cannot explain, with its size in milliseconds. */
export interface ClockSkew {
  readonly ms: number;
  readonly kibanaTime: number;
  readonly elasticsearchTime: number;
}

export type ClockSkewClassification =
  | { readonly type: 'inSync' }
  | { readonly type: 'skewed'; readonly skew: ClockSkew };

export type ClockSkewControlState = 'healthy' | 'skewed';

export interface ClockSkewState extends Scheduled {
  readonly controlState: ClockSkewControlState;
  readonly nextActionAt: number;
}

/** What a step meant, judged against the state it left. */
export type ClockSkewEvent =
  /** The request failed; nothing is known about this step. */
  | { readonly type: 'unavailable' }
  /** In sync, and was before. */
  | { readonly type: 'inSync' }
  /** In sync after having been skewed. */
  | { readonly type: 'recovered' }
  /** Skewed, and was not before. */
  | { readonly type: 'skewDetected'; readonly skew: ClockSkew }
  /** Skewed, and was before. */
  | { readonly type: 'skewPersists'; readonly skew: ClockSkew };

// State

export const initialState = (nextActionAt: number): ClockSkewState => ({
  controlState: 'healthy',
  nextActionAt,
});

const pollingInterval = (controlState: ClockSkewControlState): number =>
  controlState === 'skewed' ? CLOCK_SKEW_REMINDER_INTERVAL_MS : CLOCK_SKEW_CHECK_INTERVAL_MS;

// Action

/** The one action: sample every node's clock, bracketed by Kibana's own. */
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

// Model

/**
 * A node is skewed when its clock cannot be explained by the round trip: it
 * reads more than the tolerance before the request left or after the response
 * arrived. Kibana's time is the instant of the round trip closest to the
 * node's, so the reported skew is a lower bound.
 */
export const classifyClockSkew = ({
  requestedAt,
  respondedAt,
  timestamps,
}: ClockSkewSample): ClockSkewClassification => {
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

/** The transition function: everything that drives the machine is here. */
export const model = (
  state: ClockSkewState,
  result: ActionResult<ClockSkewSample>
): AugmentedState<ClockSkewState, ClockSkewEvent> => {
  const transitionTo = (controlState: ClockSkewControlState): ClockSkewState => ({
    controlState,
    nextActionAt: nextOnGrid(state.nextActionAt, result.completedAt, pollingInterval(controlState)),
  });

  if (!result.ok) {
    // Keep the state and its interval; there is nothing new to say.
    return { state: transitionTo(state.controlState), event: { type: 'unavailable' } };
  }

  const wasSkewed = state.controlState === 'skewed';
  const classification = classifyClockSkew(result.value);
  if (classification.type === 'inSync') {
    return { state: transitionTo('healthy'), event: { type: wasSkewed ? 'recovered' : 'inSync' } };
  }
  return {
    state: transitionTo('skewed'),
    event: { type: wasSkewed ? 'skewPersists' : 'skewDetected', skew: classification.skew },
  };
};

// Machine

/** The machine, given its one action; `next` is constant because there is only one. */
export const clockSkewMachine = (
  action: Action<ClockSkewSample>
): StateActionMachine<ClockSkewState, ClockSkewSample, ClockSkewEvent> => ({
  initialState,
  next: () => action,
  model,
});

// Presentation

const describeSkew = (still: '' | 'still ', { ms, kibanaTime, elasticsearchTime }: ClockSkew) =>
  `Kibana and Elasticsearch clocks are ${still}out of sync by at least ${ms}ms. Kibana time: ${new Date(
    kibanaTime
  ).toISOString()}; Elasticsearch time: ${new Date(elasticsearchTime).toISOString()}.`;

/** How each event is told to the operator. Memoryless: the event already says what changed. */
export const logClockSkewEvent = (log: Logger, event: ClockSkewEvent | InitialEvent): void => {
  switch (event.type) {
    case 'initial':
    case 'unavailable':
    case 'inSync':
      return;
    case 'recovered':
      log.info('Kibana and Elasticsearch clocks are in sync again.');
      return;
    case 'skewDetected':
      log.error(describeSkew('', event.skew));
      return;
    case 'skewPersists':
      log.error(describeSkew('still ', event.skew));
      return;
  }
};

export interface PollEsNodesClockSkewOptions {
  internalClient: ElasticsearchClient;
  log: Logger;
  /** Ends the check. The returned promise resolves once the machine has stopped. */
  signal: AbortSignal;
}

/** Runs the clock skew check against the cluster, logging its events, until `signal` aborts. */
export const pollEsNodesClockSkew = async (
  { internalClient, log, signal }: PollEsNodesClockSkewOptions,
  clock: Clock = realClock
): Promise<void> => {
  const machine = clockSkewMachine(sampleClocks(internalClient));
  for await (const { event } of run(machine, clock, signal)) {
    logClockSkewEvent(log, event);
  }
};
