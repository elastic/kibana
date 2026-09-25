/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Elasticsearch version check as a state-action machine. The control state
 * picks the polling interval: STARTUP until the cluster is first compatible,
 * FAILING while the request fails, NORMAL otherwise.
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

export type NodesVersionResult = ActionResult<NodesInfo>;

export type NodesVersionControlState = 'STARTUP' | 'NORMAL' | 'FAILING';

export interface NodesVersionState extends Scheduled {
  readonly controlState: NodesVersionControlState;
  /** `undefined` until the first compatibility settles. */
  readonly compatibility: NodesVersionCompatibility | undefined;
  /** Retries left before a request error settles as the compatibility. */
  readonly attemptsLeft: number;
  readonly nextActionAt: number;
}

export type NodesVersionEvent =
  | { readonly type: 'retried' }
  | { readonly type: 'compatibilityChanged'; readonly compatibility: NodesVersionCompatibility }
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

const pollingInterval = (
  config: NodesVersionConfig,
  controlState: NodesVersionControlState
): number => {
  switch (controlState) {
    case 'STARTUP':
      // `||`, not `??`: a configured zero falls back, as the failure interval does.
      return config.healthCheckStartupInterval || config.healthCheckInterval;
    case 'FAILING':
      return config.healthCheckFailureInterval || config.healthCheckInterval;
    case 'NORMAL':
      return config.healthCheckInterval;
  }
};

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

const nextControlState = (
  state: NodesVersionState,
  result: NodesVersionResult,
  compatibility: NodesVersionCompatibility
): NodesVersionControlState => {
  if (state.controlState === 'STARTUP' && !compatibility.isCompatible) {
    // A request error before the cluster was ever compatible is still startup.
    return 'STARTUP';
  }
  // An incompatible but reachable cluster is NORMAL: only request errors are FAILING.
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

export const nodesVersionMachine = (
  action: Action<NodesInfo>,
  config: NodesVersionConfig
): StateActionMachine<NodesVersionState, NodesInfo, NodesVersionEvent> => ({
  initialState: (start) => initialState(config, start),
  next: () => action,
  model: (state, result) => model(config, state, result),
});

export interface CheckEsNodesVersionOptions {
  internalClient: ElasticsearchClient;
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
}

/** A single compatibility check, retrying a failed request once without delay. */
export const checkEsNodesVersion = async ({
  internalClient,
  kibanaVersion,
  ignoreVersionMismatch,
}: CheckEsNodesVersionOptions): Promise<NodesVersionCompatibility> => {
  const machine = nodesVersionMachine(fetchNodesInfo(internalClient), {
    kibanaVersion,
    ignoreVersionMismatch,
    healthCheckInterval: 0,
    healthCheckRetry: 1,
  });
  for await (const { event } of run(machine)) {
    if (event.type === 'compatibilityChanged') {
      return event.compatibility;
    }
  }
  throw new Error('The version check stopped without a compatibility');
};

export interface PollEsNodesVersionOptions extends NodesVersionConfig {
  internalClient: ElasticsearchClient;
  log: Logger;
  signal: AbortSignal;
}

/** Polls until `signal` aborts, emitting each changed compatibility and replaying the latest. */
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
