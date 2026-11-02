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
 * names the polling interval: STARTUP until the cluster is first compatible,
 * FAILING while the request fails, NORMAL otherwise.
 */

import { ReplaySubject, type Observable } from 'rxjs';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { HEALTH_CHECK_REQUEST_TIMEOUT } from './constants';
import {
  compatibilityFromNodesInfo,
  sameCompatibility,
  type NodesInfo,
  type NodesVersionCompatibility,
} from './nodes_version_compatibility';
import {
  attempt,
  realClock,
  run,
  type Action,
  type ActionResult,
  type AugmentedState,
  type Clock,
  type StateActionMachine,
} from './state_action_machine';

export interface NodesVersionConfig {
  kibanaVersion: string;
  ignoreVersionMismatch: boolean;
  healthCheckInterval: number;
  healthCheckFailureInterval: number;
  healthCheckStartupInterval: number;
  healthCheckRetry: number;
}

export type NodesVersionResult = ActionResult<NodesInfo>;

export type NodesVersionControlState = 'STARTUP' | 'NORMAL' | 'FAILING';

export interface NodesVersionState {
  readonly controlState: NodesVersionControlState;
  /** `undefined` until the first compatibility settles. */
  readonly compatibility: NodesVersionCompatibility | undefined;
  /** Failed requests since the last settled compatibility; each is retried up to `healthCheckRetry`. */
  readonly failures: number;
}

export type NodesVersionEvent =
  | { readonly type: 'retried' }
  | { readonly type: 'compatibilityChanged'; readonly compatibility: NodesVersionCompatibility }
  | { readonly type: 'compatibilityUnchanged' };

const initialState: NodesVersionState = {
  controlState: 'STARTUP',
  compatibility: undefined,
  failures: 0,
};

const pollingInterval = (
  config: NodesVersionConfig,
  controlState: NodesVersionControlState
): number => {
  switch (controlState) {
    case 'STARTUP':
      return config.healthCheckStartupInterval;
    case 'FAILING':
      return config.healthCheckFailureInterval;
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
    // Until the cluster is first compatible, neither an error nor an incompatible answer ends startup.
    return 'STARTUP';
  }
  // An incompatible but reachable cluster is NORMAL: only request errors are FAILING.
  return result.ok ? 'NORMAL' : 'FAILING';
};

const model = (
  config: NodesVersionConfig,
  state: NodesVersionState,
  result: NodesVersionResult
): AugmentedState<NodesVersionState, NodesVersionEvent> => {
  if (!result.ok && state.failures < config.healthCheckRetry) {
    return {
      state: {
        ...state,
        failures: state.failures + 1,
      },
      event: { type: 'retried' },
    };
  }

  const compatibility = compatibilityFromNodesInfo(
    result,
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
      failures: 0,
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
  initialState,
  next: () => action,
  model: (state, result) => {
    const step = model(config, state, result);
    return { ...step, wait: pollingInterval(config, step.state.controlState) };
  },
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
  const fetch = fetchNodesInfo(internalClient);
  const check = async () =>
    compatibilityFromNodesInfo(
      await attempt(fetch, realClock.now),
      kibanaVersion,
      ignoreVersionMismatch
    );
  const first = await check();
  return first.nodesInfoRequestError ? check() : first;
};

export interface PollEsNodesVersionOptions extends NodesVersionConfig {
  internalClient: ElasticsearchClient;
  signal: AbortSignal;
}

/** Polls until `signal` aborts, emitting each changed compatibility and replaying the latest. */
export const pollEsNodesVersion = (
  { internalClient, signal, ...config }: PollEsNodesVersionOptions,
  clock: Clock = realClock
): Observable<NodesVersionCompatibility> => {
  const compatibility$ = new ReplaySubject<NodesVersionCompatibility>(1);
  const machine = nodesVersionMachine(fetchNodesInfo(internalClient), config);

  const poll = async (): Promise<void> => {
    for await (const { event } of run(machine, clock, signal)) {
      if (event.type === 'compatibilityChanged') {
        compatibility$.next(event.compatibility);
      }
    }
  };
  poll().then(
    () => compatibility$.complete(),
    (error) => compatibility$.error(error)
  );

  return compatibility$.asObservable();
};
