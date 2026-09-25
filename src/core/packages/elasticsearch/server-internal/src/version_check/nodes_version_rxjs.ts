/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * RxJS glue: turns the version check machine into the `esNodesCompatibility$`
 * observable the service expects. RxJS adds only what a generator cannot give
 * several consumers: multicast, replay for late `first(...)` subscribers, and
 * teardown that aborts the machine. Nothing here knows how the cluster is asked.
 */

import { defer, filter, finalize, from, map, shareReplay, type Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { NodesInfo, NodesVersionCompatibility } from './nodes_version_compatibility';
import {
  run,
  type AugmentedState,
  type Clock,
  type InitialEvent,
  type StateActionMachine,
} from './state_action_machine';
import {
  fetchNodesInfo,
  nodesVersionMachine,
  type NodesVersionConfig,
  type NodesVersionEvent,
  type NodesVersionState,
} from './nodes_version';

/** @public */
export interface PollEsNodesVersionOptions extends NodesVersionConfig {
  internalClient: ElasticsearchClient;
  log: Logger;
}

type NodesVersionMachine = StateActionMachine<NodesVersionState, NodesInfo, NodesVersionEvent>;
type CompatibilityChanged = Extract<NodesVersionEvent, { type: 'compatibilityChanged' }>;

/** Every augmented state the machine passes through. */
export const nodesVersionStates$ = (
  machine: NodesVersionMachine,
  clock?: Clock
): Observable<AugmentedState<NodesVersionState, NodesVersionEvent | InitialEvent>> =>
  defer(() => {
    const controller = new AbortController();
    return from(run(machine, clock, controller.signal)).pipe(finalize(() => controller.abort()));
  });

/** The change-only compatibility, shaped for the `esNodesCompatibility$` consumers. */
export const esNodesCompatibility$ = (
  machine: NodesVersionMachine,
  clock?: Clock
): Observable<NodesVersionCompatibility> =>
  nodesVersionStates$(machine, clock).pipe(
    map(({ event }) => event),
    filter((event): event is CompatibilityChanged => event.type === 'compatibilityChanged'),
    map(({ compatibility }) => compatibility),
    shareReplay({ refCount: true, bufferSize: 1 })
  );

export const pollEsNodesVersion = (
  { internalClient, log, ...config }: PollEsNodesVersionOptions,
  clock?: Clock
): Observable<NodesVersionCompatibility> => {
  log.debug('Checking Elasticsearch version');
  return esNodesCompatibility$(nodesVersionMachine(fetchNodesInfo(internalClient), config), clock);
};
