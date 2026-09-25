/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Elasticsearch version health check as a state-action machine.
 *
 *   state   `NodesVersionState`; the control state selects the polling
 *           interval: STARTUP until a compatible response, FAILING while the
 *           request itself fails, NORMAL once the cluster answered
 *   action  `fetchNodesInfo`: one node info request for every node's version
 *           and address
 *   model   `model`: maps the response to a compatibility and says whether it
 *           changed
 *
 * A step settles when its result becomes the known compatibility; a retry
 * uses an attempt and settles nothing. Every step, retries included,
 * schedules the next request on the grid anchored at the time the last one
 * was due. The RxJS original retried at a fixed delay after the failure;
 * that was the shape of `retry({ delay })`, not a requirement.
 */

import { ReplaySubject, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { HEALTH_CHECK_REQUEST_TIMEOUT } from './constants';
import {
  mapNodesVersionCompatibility,
  sameCompatibility,
  type NodesInfo,
  type NodesVersionCompatibility,
} from './nodes_version_compatibility';
import {
  nextOnGrid,
  realClock,
  run,
  type Action,
  type ActionResult,
  type AugmentedState,
  type Clock,
  type Scheduled,
  type StateActionMachine,
} from './state_action_machine';

export interface NodesVersionConfig {
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
  healthCheckInterval: number;
  healthCheckFailureInterval?: number;
  healthCheckStartupInterval?: number;
  healthCheckRetry: number;
}

/** What one node info request returned, and when. */
export type NodesVersionResult = ActionResult<NodesInfo>;

export type NodesVersionControlState = 'STARTUP' | 'NORMAL' | 'FAILING';

export interface NodesVersionState extends Scheduled {
  readonly controlState: NodesVersionControlState;
  /** The compatibility that led to this state; `undefined` until one is known. */
  readonly compatibility: NodesVersionCompatibility | undefined;
  /** Requests left before a request error becomes the known compatibility. */
  readonly attemptsLeft: number;
  readonly nextActionAt: number;
}

/** What a step meant, judged against the state it left. */
export type NodesVersionEvent =
  /** A request error used an attempt; nothing settled. */
  | { readonly type: 'retried' }
  /** A compatibility settled that differs from the last known one, or is the first. */
  | { readonly type: 'compatibilityChanged'; readonly compatibility: NodesVersionCompatibility }
  /** A compatibility settled that is observably equal to the last known one. */
  | { readonly type: 'compatibilityUnchanged' };

export const initialState = (
  config: NodesVersionConfig,
  nextActionAt: number
): NodesVersionState => ({
  controlState: 'STARTUP',
  compatibility: undefined,
  attemptsLeft: config.healthCheckRetry,
  nextActionAt,
});

/** The polling interval of each control state. */
const pollingInterval = (
  config: NodesVersionConfig,
  controlState: NodesVersionControlState
): number => {
  switch (controlState) {
    case 'STARTUP':
      // `||`, not `??`: a configured zero would divide the grid by zero.
      return config.healthCheckStartupInterval || config.healthCheckInterval;
    case 'FAILING':
      return config.healthCheckFailureInterval || config.healthCheckInterval;
    case 'NORMAL':
      return config.healthCheckInterval;
  }
};

/** Ask every node for its version and address. */
export const fetchNodesInfo =
  (internalClient: ElasticsearchClient): Action<NodesInfo> =>
  (signal) =>
    internalClient.nodes.info(
      {
        node_id: '_all',
        metric: '_none',
        filter_path: ['nodes.*.version', 'nodes.*.http.publish_address', 'nodes.*.ip'],
      },
      { requestTimeout: HEALTH_CHECK_REQUEST_TIMEOUT, signal }
    );

/** The control state a settled request leads to. */
const nextControlState = (
  state: NodesVersionState,
  result: NodesVersionResult,
  compatibility: NodesVersionCompatibility
): NodesVersionControlState => {
  if (state.controlState === 'STARTUP' && !compatibility.isCompatible) {
    // Not compatible and never has been: still starting up. A request error
    // during startup is not yet a failure, since nothing has ever answered.
    return 'STARTUP';
  }
  // Out of attempts, the request itself is failing. A reachable cluster on an
  // incompatible version is not: the health check is working, so poll normally.
  return result.ok ? 'NORMAL' : 'FAILING';
};

export const model = (
  config: NodesVersionConfig,
  state: NodesVersionState,
  result: NodesVersionResult
): AugmentedState<NodesVersionState, NodesVersionEvent> => {
  const schedule = (controlState: NodesVersionControlState): number =>
    nextOnGrid(state.nextActionAt, result.completedAt, pollingInterval(config, controlState));

  if (!result.ok && state.attemptsLeft > 0) {
    // The request failed and attempts remain: use one, settle nothing.
    return {
      state: {
        ...state,
        attemptsLeft: state.attemptsLeft - 1,
        nextActionAt: schedule(state.controlState),
      },
      event: { type: 'retried' },
    };
  }

  const compatibility = mapNodesVersionCompatibility(
    result.ok ? result.value : { nodes: {}, nodesInfoRequestError: result.error },
    config.kibanaVersion,
    config.ignoreVersionMismatch
  );
  const controlState = nextControlState(state, result, compatibility);
  const changed =
    state.compatibility === undefined || !sameCompatibility(state.compatibility, compatibility);
  return {
    state: {
      controlState,
      compatibility,
      attemptsLeft: config.healthCheckRetry,
      nextActionAt: schedule(controlState),
    },
    event: changed
      ? { type: 'compatibilityChanged', compatibility }
      : { type: 'compatibilityUnchanged' },
  };
};

/** `next` is constant: there is only one action. */
export const nodesVersionMachine = (
  action: Action<NodesInfo>,
  config: NodesVersionConfig
): StateActionMachine<NodesVersionState, NodesInfo, NodesVersionEvent> => ({
  initialState: (start) => initialState(config, start),
  next: () => action,
  model: (state, result) => model(config, state, result),
});

// Runner

export interface CheckEsNodesVersionOptions {
  internalClient: ElasticsearchClient;
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
}

/**
 * One compatibility check, for a caller that needs a single answer rather than
 * a poll (interactive setup). One request, retried once on failure; a second
 * failure is reported as the compatibility's `nodesInfoRequestError`.
 */
export const checkEsNodesVersion = async ({
  internalClient,
  kibanaVersion,
  ignoreVersionMismatch,
}: CheckEsNodesVersionOptions): Promise<NodesVersionCompatibility> => {
  const fetch = fetchNodesInfo(internalClient);
  const attempt = async (): Promise<NodesInfo & { nodesInfoRequestError?: Error }> => {
    try {
      return await fetch();
    } catch (error) {
      return {
        nodes: {},
        nodesInfoRequestError: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
  const first = await attempt();
  const outcome = first.nodesInfoRequestError ? await attempt() : first;
  return mapNodesVersionCompatibility(outcome, kibanaVersion, ignoreVersionMismatch);
};

/** @public */
export interface PollEsNodesVersionOptions extends NodesVersionConfig {
  internalClient: ElasticsearchClient;
  log: Logger;
  /** Ends the check. The returned observable completes once the machine has stopped. */
  signal: AbortSignal;
}

/**
 * Runs the version check against the cluster until `signal` aborts, logging an
 * incompatible cluster, and returns the change-only compatibility with the
 * latest replayed to late subscribers: the shape `isValidConnection`, the saved
 * objects service, and the status stream expect.
 */
export const pollEsNodesVersion = (
  { internalClient, log, signal, ...config }: PollEsNodesVersionOptions,
  clock: Clock = realClock
): Observable<NodesVersionCompatibility> => {
  log.debug('Checking Elasticsearch version');
  const compatibility$ = new ReplaySubject<NodesVersionCompatibility>(1);
  const machine = nodesVersionMachine(fetchNodesInfo(internalClient), config);

  const poll = async (): Promise<void> => {
    for await (const { event } of run(machine, clock, signal)) {
      if (event.type !== 'compatibilityChanged') {
        continue;
      }
      const { compatibility } = event;
      if (!compatibility.isCompatible && compatibility.message) {
        log.error(compatibility.message);
      }
      compatibility$.next(compatibility);
    }
  };
  poll().then(
    () => compatibility$.complete(),
    (error) => compatibility$.error(error)
  );

  return compatibility$.asObservable();
};
