/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, lastValueFrom, take, toArray } from 'rxjs';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  esNodesCompatibility$,
  nodesVersionStates$,
  pollEsNodesVersion,
} from './nodes_version_rxjs';
import { nodesVersionMachine, type NodesVersionConfig } from './nodes_version';
import type { NodesInfo } from './nodes_version_compatibility';
import type { Action } from './state_action_machine';

const config: NodesVersionConfig = {
  kibanaVersion: '8.10.0',
  ignoreVersionMismatch: false,
  healthCheckInterval: 1,
  healthCheckStartupInterval: 1,
  healthCheckRetry: 1,
};

const compatible: NodesInfo = { nodes: { a: { version: '8.10.0', ip: '1.1.1.1', name: 'a' } } };
const incompatible: NodesInfo = { nodes: { a: { version: '7.0.0', ip: '1.1.1.1', name: 'a' } } };

const machineOf = (action: Action<NodesInfo>) => nodesVersionMachine(action, config);

describe('the machine driven by RxJS', () => {
  it('produces the same states the generator does, initial state and events included', async () => {
    const steps = await lastValueFrom(
      nodesVersionStates$(machineOf(() => Promise.resolve(compatible))).pipe(take(3), toArray())
    );
    expect(steps.map(({ state }) => state.controlState)).toEqual(['STARTUP', 'NORMAL', 'NORMAL']);
    expect(steps.map(({ event }) => event.type)).toEqual([
      'initial',
      'compatibilityChanged',
      'compatibilityUnchanged',
    ]);
    expect(steps[0].state.compatibility).toBeUndefined();
    expect(steps[1].state.compatibility?.isCompatible).toBe(true);
  });

  it('stops polling when the last subscriber leaves', async () => {
    let requests = 0;
    const compatibility$ = esNodesCompatibility$(
      machineOf(() => {
        requests++;
        return Promise.resolve(compatible);
      })
    );

    await firstValueFrom(compatibility$);
    const requestsAtUnsubscribe = requests;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(requests).toBe(requestsAtUnsubscribe);
  });
});

describe('what the async generator could not do', () => {
  it('multicasts: one poller serves every subscriber', async () => {
    let requests = 0;
    const compatibility$ = esNodesCompatibility$(
      machineOf(() => {
        requests++;
        return Promise.resolve(compatible);
      })
    );

    // Two independent consumers, as `calculateStatus$` and the logging
    // subscription are. Against a generator these would split the states.
    const [a, b] = await Promise.all([
      firstValueFrom(compatibility$),
      firstValueFrom(compatibility$),
    ]);

    expect(a).toBe(b);
    expect(requests).toBe(1);
  });

  it('replays the latest compatibility to a late subscriber', async () => {
    const compatibility$ = esNodesCompatibility$(machineOf(() => Promise.resolve(compatible)));
    const held = compatibility$.subscribe(); // keep the refCount open

    const first = await firstValueFrom(compatibility$);
    // `isValidConnection` and the saved objects service both subscribe late and
    // take `first(...)`; against a generator they would block for a full poll.
    const late = await firstValueFrom(compatibility$);

    expect(late).toBe(first);
    held.unsubscribe();
  });

  it('emits only the compatibilities the machine judged changed', async () => {
    const requests = [compatible, compatible, incompatible];
    let i = 0;
    const compatibilities = await lastValueFrom(
      esNodesCompatibility$(
        machineOf(() => Promise.resolve(requests[Math.min(i++, requests.length - 1)]))
      ).pipe(take(2), toArray())
    );

    expect(compatibilities.map((c) => c.isCompatible)).toEqual([true, false]);
  });
});

describe('pollEsNodesVersion', () => {
  it('requests node versions once for concurrent subscribers', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info.mockResolvedValue(compatible as never);
    const log = loggingSystemMock.createLogger();
    const compatibility$ = pollEsNodesVersion({ internalClient, log, ...config });

    await Promise.all([firstValueFrom(compatibility$), firstValueFrom(compatibility$)]);

    expect(internalClient.nodes.info).toHaveBeenCalledTimes(1);
    expect(internalClient.nodes.info).toHaveBeenCalledWith(
      {
        node_id: '_all',
        metric: '_none',
        filter_path: ['nodes.*.version', 'nodes.*.http.publish_address', 'nodes.*.ip'],
      },
      { requestTimeout: expect.any(Number), signal: expect.any(AbortSignal) }
    );
  });
});

/*
 * Timing parity with the upstream marble contract is asserted in
 * nodes_version_timeline.test.ts by injecting time into the machine
 * directly, not here. Change detection is asserted in nodes_version.test.ts,
 * where it now lives. This delivery layer runs the machine on real time, which
 * TestScheduler cannot pump; it only proves distribution (multicast, replay,
 * teardown).
 */
