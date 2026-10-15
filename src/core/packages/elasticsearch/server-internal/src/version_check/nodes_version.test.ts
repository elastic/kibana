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
  initialState,
  model,
  nodesVersionMachine,
  pollEsNodesVersion,
  type NodesVersionResult,
  type NodesVersionConfig,
  type NodesVersionState,
} from './nodes_version';
import { compatibilityFromNodesInfo, type NodesInfo } from './nodes_version_compatibility';
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
const ok = (nodes: NodesInfo): NodesVersionResult => ({ ok: true, value: nodes, completedAt: 0 });
const fail = (error: Error): NodesVersionResult => ({ ok: false, error, completedAt: 0 });

const compatibilityOf = (nodes: NodesInfo) =>
  compatibilityFromNodesInfo(nodes, config.kibanaVersion, config.ignoreVersionMismatch);

/** A state after the cluster first answered compatible. */
const normal: NodesVersionState = {
  controlState: 'NORMAL',
  compatibility: compatibilityOf(compatible),
  failures: 0,
};

describe('the wait of a step', () => {
  const { model: step } = nodesVersionMachine(async () => compatible, config);

  it('is the interval of the control state the step reached', () => {
    expect(step(initialState, ok(incompatible)).wait).toBe(config.healthCheckStartupInterval);
    expect(step(initialState, ok(compatible)).wait).toBe(config.healthCheckInterval);
    expect(step({ ...normal, failures: config.healthCheckRetry }, fail(requestError)).wait).toBe(
      config.healthCheckFailureInterval
    );
    expect(step(normal, ok(compatible)).wait).toBe(config.healthCheckInterval);
  });

  it('keeps the interval of the current control state through a retry', () => {
    expect(step(initialState, fail(requestError)).wait).toBe(config.healthCheckStartupInterval);
    expect(step(normal, fail(requestError)).wait).toBe(config.healthCheckInterval);
  });
});

describe('FAILING tracks request errors, not incompatibility', () => {
  const settled: NodesVersionState = { ...normal, failures: config.healthCheckRetry };

  it('stays NORMAL for a reachable cluster running an incompatible version', () => {
    const { state: primed } = model(config, settled, ok(incompatible));
    expect(primed.compatibility?.isCompatible).toBe(false);
    expect(primed.controlState).toBe('NORMAL');
  });

  it('goes FAILING when the request itself fails', () => {
    const { state: primed } = model(config, settled, fail(requestError));
    expect(primed.controlState).toBe('FAILING');
  });
});

describe('failures', () => {
  it('counts request errors without settling a compatibility, up to the retry count', () => {
    const first = model(config, normal, fail(requestError));
    expect(first).toEqual({
      state: { ...normal, failures: 1 },
      event: { type: 'retried' },
    });

    const second = model(config, first.state, fail(requestError));
    expect(second).toEqual({
      state: { ...normal, failures: 2 },
      event: { type: 'retried' },
    });

    const { state: settled } = model(config, second.state, fail(requestError));
    expect(settled.controlState).toBe('FAILING');
    expect(settled.failures).toBe(0);
  });

  it('resets when a compatibility settles', () => {
    const { state: failed } = model(config, normal, fail(requestError));
    expect(model(config, failed, ok(compatible)).state.failures).toBe(0);
  });
});

describe('STARTUP', () => {
  it('is the initial state, with no compatibility and no failures', () => {
    expect(initialState).toEqual({
      controlState: 'STARTUP',
      compatibility: undefined,
      failures: 0,
    });
  });

  it('lasts until the cluster is first compatible, whether it answers incompatible or fails', () => {
    const { state: answered } = model(config, initialState, ok(incompatible));
    expect(answered.controlState).toBe('STARTUP');

    const exhausted = { ...initialState, failures: config.healthCheckRetry };
    const { state: failed } = model(config, exhausted, fail(requestError));
    expect(failed.controlState).toBe('STARTUP');

    expect(model(config, answered, ok(compatible)).state.controlState).toBe('NORMAL');
  });
});

describe('the event of a step', () => {
  it('is compatibilityChanged for the first compatibility, whatever it is', () => {
    const { state, event } = model(config, initialState, ok(incompatible));
    expect(event).toEqual({ type: 'compatibilityChanged', compatibility: state.compatibility });
  });

  it('is compatibilityUnchanged when the same cluster answers again', () => {
    expect(model(config, normal, ok(compatible)).event).toEqual({ type: 'compatibilityUnchanged' });
  });

  it('is compatibilityChanged when the request starts failing, and again when it recovers', () => {
    const failing = model(
      config,
      { ...normal, failures: config.healthCheckRetry },
      fail(requestError)
    );
    expect(failing.event.type).toBe('compatibilityChanged');

    const recovered = model(config, failing.state, ok(compatible));
    expect(recovered.event.type).toBe('compatibilityChanged');
  });

  it('is retried while attempts remain, and the compatibility it keeps is not re-announced', () => {
    const { state: used, event } = model(config, normal, fail(requestError));
    expect(event).toEqual({ type: 'retried' });
    expect(model(config, used, ok(compatible)).event).toEqual({ type: 'compatibilityUnchanged' });
  });
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
