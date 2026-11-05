/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  checkEsNodesVersion,
  fetchNodesInfo,
  nodesVersionMachine,
  pollEsNodesVersion,
  type NodesVersionConfig,
  type NodesVersionControlState,
  type NodesVersionEvent,
  type NodesVersionResult,
  type NodesVersionState,
} from './nodes_version';
import {
  compatibilityFromNodesInfo,
  type NodesInfo,
  type NodesVersionCompatibility,
} from './nodes_version_compatibility';
import { virtualClock } from './state_action_machine.test_helpers';

const config: NodesVersionConfig = {
  kibanaVersion: '8.10.0',
  ignoreVersionMismatch: false,
  healthCheckInterval: 2500,
  healthCheckFailureInterval: 500,
  healthCheckStartupInterval: 100,
  healthCheckRetry: 2,
};

const compatible: NodesInfo = { nodes: { a: { version: '8.10.0', ip: '1.1.1.1', name: 'a' } } };
/** Reachable cluster, wrong version: not compatible, but not a failing health check. */
const incompatible: NodesInfo = { nodes: { a: { version: '7.0.0', ip: '1.1.1.1', name: 'a' } } };
const requestError = new Error('boom');

// The version model ignores `completedAt`.
const results = {
  compatible: { ok: true, value: compatible, completedAt: 0 },
  incompatible: { ok: true, value: incompatible, completedAt: 0 },
  error: { ok: false, error: requestError, completedAt: 0 },
} satisfies Record<string, NodesVersionResult>;
type Response = keyof typeof results;

const compatibilityOf = (response: Response) =>
  compatibilityFromNodesInfo(results[response], config.kibanaVersion, config.ignoreVersionMismatch);

const settledCompatibility = {
  compatible: compatibilityOf('compatible'),
  incompatible: compatibilityOf('incompatible'),
  error: compatibilityOf('error'),
} satisfies Record<Response, NodesVersionCompatibility>;

const interval = {
  STARTUP: config.healthCheckStartupInterval,
  NORMAL: config.healthCheckInterval,
  FAILING: config.healthCheckFailureInterval,
} satisfies Record<NodesVersionControlState, number>;

describe('the version machine', () => {
  const machine = nodesVersionMachine(async () => compatible, config);

  /** A state in each control state; STARTUP is the initial state. */
  const states: Record<NodesVersionControlState, NodesVersionState> = {
    STARTUP: machine.initialState,
    NORMAL: { controlState: 'NORMAL', compatibility: settledCompatibility.compatible, failures: 0 },
    FAILING: { controlState: 'FAILING', compatibility: settledCompatibility.error, failures: 0 },
  };

  // Each step waits the interval of the control state it reached. A retried error keeps the
  // last compatibility and counts a failure; any other response settles as the compatibility
  // and resets the count.
  it.each`
    from         | retries      | response          | to           | event
    ${'STARTUP'} | ${'left'}    | ${'compatible'}   | ${'NORMAL'}  | ${'compatibilityChanged'}
    ${'STARTUP'} | ${'left'}    | ${'incompatible'} | ${'STARTUP'} | ${'compatibilityChanged'}
    ${'STARTUP'} | ${'left'}    | ${'error'}        | ${'STARTUP'} | ${'retried'}
    ${'STARTUP'} | ${'used up'} | ${'error'}        | ${'STARTUP'} | ${'compatibilityChanged'}
    ${'NORMAL'}  | ${'left'}    | ${'compatible'}   | ${'NORMAL'}  | ${'compatibilityUnchanged'}
    ${'NORMAL'}  | ${'left'}    | ${'incompatible'} | ${'NORMAL'}  | ${'compatibilityChanged'}
    ${'NORMAL'}  | ${'left'}    | ${'error'}        | ${'NORMAL'}  | ${'retried'}
    ${'NORMAL'}  | ${'used up'} | ${'error'}        | ${'FAILING'} | ${'compatibilityChanged'}
    ${'NORMAL'}  | ${'used up'} | ${'compatible'}   | ${'NORMAL'}  | ${'compatibilityUnchanged'}
    ${'FAILING'} | ${'left'}    | ${'error'}        | ${'FAILING'} | ${'retried'}
    ${'FAILING'} | ${'used up'} | ${'error'}        | ${'FAILING'} | ${'compatibilityUnchanged'}
    ${'FAILING'} | ${'left'}    | ${'compatible'}   | ${'NORMAL'}  | ${'compatibilityChanged'}
    ${'FAILING'} | ${'left'}    | ${'incompatible'} | ${'NORMAL'}  | ${'compatibilityChanged'}
  `(
    'in $from with retries $retries, $response goes to $to: $event',
    ({
      from,
      retries,
      response,
      to,
      event,
    }: {
      from: NodesVersionControlState;
      retries: 'left' | 'used up';
      response: Response;
      to: NodesVersionControlState;
      event: NodesVersionEvent['type'];
    }) => {
      const before = {
        ...states[from],
        failures: retries === 'left' ? 0 : config.healthCheckRetry,
      };
      const step = machine.model(before, results[response]);

      expect({ ...step, event: step.event.type }).toEqual({
        state:
          event === 'retried'
            ? { ...before, failures: before.failures + 1 }
            : { controlState: to, compatibility: settledCompatibility[response], failures: 0 },
        event,
        wait: interval[to],
      });
    }
  );
});

describe('fetchNodesInfo', () => {
  it('asks every node for its version and address, forwarding the signal', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info.mockResolvedValue(compatible as never);
    const signal = new AbortController().signal;

    const response = await fetchNodesInfo(internalClient)(signal);

    expect(response).toBe(compatible);
    expect(internalClient.nodes.info).toHaveBeenCalledWith(
      {
        node_id: '_all',
        metric: '_none',
        filter_path: ['nodes.*.version', 'nodes.*.http.publish_address', 'nodes.*.ip'],
      },
      { requestTimeout: expect.any(Number), signal }
    );
  });
});

describe('pollEsNodesVersion', () => {
  /** Answers each request from `responses`; the request after the last response aborts the poll. */
  const poll = async (responses: NodesInfo[]) => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    const controller = new AbortController();
    let calls = 0;
    internalClient.nodes.info.mockImplementation((async () => {
      if (calls === responses.length) {
        controller.abort(); // this result arrives after the abort and is dropped
      }
      return responses[Math.min(calls++, responses.length - 1)];
    }) as never);
    const compatibility$ = pollEsNodesVersion(
      { ...config, internalClient, signal: controller.signal },
      virtualClock()
    );
    const emitted = await lastValueFrom(compatibility$.pipe(toArray()));
    return { compatibility$, emitted };
  };

  it('emits only when the compatibility changes, and completes once aborted', async () => {
    const { emitted } = await poll([compatible, compatible, incompatible]);
    expect(emitted.map((c) => c.isCompatible)).toEqual([true, false]);
  });

  it('publishes each compatibility with its nodes named and a message', async () => {
    const { emitted } = await poll([incompatible]);
    expect(emitted).toEqual([
      expect.objectContaining({
        isCompatible: false,
        kibanaVersion: config.kibanaVersion,
        message: expect.stringContaining('v7.0.0 @ undefined (1.1.1.1)'),
        incompatibleNodes: [expect.objectContaining({ name: 'v7.0.0 @ undefined (1.1.1.1)' })],
      }),
    ]);
  });

  it('replays the latest compatibility to a late subscriber', async () => {
    const { compatibility$ } = await poll([compatible]);
    expect((await firstValueFrom(compatibility$)).isCompatible).toBe(true);
  });
});

describe('checkEsNodesVersion', () => {
  const check = (internalClient: ReturnType<typeof elasticsearchClientMock.createInternalClient>) =>
    checkEsNodesVersion({
      internalClient,
      kibanaVersion: config.kibanaVersion,
      ignoreVersionMismatch: false,
    });

  it('answers once from a single request', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info.mockResolvedValue(compatible as never);

    expect((await check(internalClient)).isCompatible).toBe(true);
    expect(internalClient.nodes.info).toHaveBeenCalledTimes(1);
  });

  it('does not retry an incompatible cluster, since it answered', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info.mockResolvedValue(incompatible as never);

    expect((await check(internalClient)).isCompatible).toBe(false);
    expect(internalClient.nodes.info).toHaveBeenCalledTimes(1);
  });

  it('retries once, immediately, when the request fails', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info
      .mockRejectedValueOnce(requestError)
      .mockResolvedValue(compatible as never);

    expect((await check(internalClient)).isCompatible).toBe(true);
    expect(internalClient.nodes.info).toHaveBeenCalledTimes(2);
  });

  it('reports the error when both requests fail', async () => {
    const internalClient = elasticsearchClientMock.createInternalClient();
    internalClient.nodes.info.mockRejectedValue(requestError);

    const compatibility = await check(internalClient);
    expect(compatibility.isCompatible).toBe(false);
    expect(compatibility.nodesInfoRequestError).toBe(requestError);
    expect(internalClient.nodes.info).toHaveBeenCalledTimes(2);
  });
});
