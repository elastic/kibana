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
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  checkEsNodesVersion,
  fetchNodesInfo,
  initialState,
  model,
  pollEsNodesVersion,
  type NodesVersionResult,
  type NodesVersionConfig,
  type NodesVersionState,
} from './nodes_version';
import { mapNodesVersionCompatibility, type NodesInfo } from './nodes_version_compatibility';
import { virtualClock } from './state_action_machine.test_helpers';

// `satisfies` keeps the optional intervals as `number` where the tests read them.
const config = {
  kibanaVersion: '8.10.0',
  ignoreVersionMismatch: false,
  healthCheckInterval: 2500,
  healthCheckFailureInterval: 500,
  healthCheckStartupInterval: 100,
  healthCheckRetry: 2,
} satisfies NodesVersionConfig;

const compatible: NodesInfo = { nodes: { a: { version: '8.10.0', ip: '1.1.1.1', name: 'a' } } };
/** Reachable cluster, wrong version: not compatible, but not a failing health check. */
const incompatible: NodesInfo = { nodes: { a: { version: '7.0.0', ip: '1.1.1.1', name: 'a' } } };
const requestError = new Error('boom');

const ok = (nodes: NodesInfo, completedAt = 0): NodesVersionResult => ({
  ok: true,
  value: nodes,
  completedAt,
});
const fail = (error: Error, completedAt = 0): NodesVersionResult => ({
  ok: false,
  error,
  completedAt,
});

/** The request outcome a settled result presents to the compatibility mapping. */
type RequestOutcome = NodesInfo & { nodesInfoRequestError?: Error };

const compatibilityOf = (outcome: RequestOutcome) =>
  mapNodesVersionCompatibility(outcome, config.kibanaVersion, config.ignoreVersionMismatch);

/** How long after the request that produced it this state schedules the next one. */
const dueIn = (state: NodesVersionState, completedAt = 0): number =>
  state.nextActionAt - completedAt;

describe('a zero interval falls back to the normal one', () => {
  it('polls at the normal interval when the failure interval is zero', () => {
    const zero = { ...config, healthCheckFailureInterval: 0 };
    const normal: NodesVersionState = {
      controlState: 'NORMAL',
      compatibility: compatibilityOf(compatible),
      attemptsLeft: 0,
      nextActionAt: 0,
    };
    expect(model(zero, normal, fail(requestError)).state.nextActionAt).toBe(
      config.healthCheckInterval
    );
  });
});

describe('FAILING tracks request errors, not incompatibility', () => {
  const normal: NodesVersionState = {
    controlState: 'NORMAL',
    compatibility: compatibilityOf(compatible),
    attemptsLeft: 0,
    nextActionAt: 0,
  };

  it('stays NORMAL for a reachable cluster running an incompatible version', () => {
    const { state: primed } = model(config, normal, ok(incompatible));
    expect(primed.compatibility?.isCompatible).toBe(false);
    expect(primed.controlState).toBe('NORMAL');
    expect(dueIn(primed)).toBe(config.healthCheckInterval);
  });

  it('goes FAILING when the request itself fails', () => {
    const { state: primed } = model(config, normal, fail(requestError));
    expect(primed.controlState).toBe('FAILING');
    expect(dueIn(primed)).toBe(config.healthCheckFailureInterval);
  });
});

describe('attemptsLeft', () => {
  const normal: NodesVersionState = {
    controlState: 'NORMAL',
    compatibility: compatibilityOf(compatible),
    attemptsLeft: config.healthCheckRetry,
    nextActionAt: 0,
  };
  const { healthCheckInterval: interval } = config;

  it('uses attempts on request errors without settling a compatibility', () => {
    const first = model(config, normal, fail(requestError, 0));
    expect(first).toEqual({
      state: { ...normal, attemptsLeft: 1, nextActionAt: interval },
      event: { type: 'retried' },
    });

    const second = model(config, first.state, fail(requestError, interval));
    expect(second).toEqual({
      state: { ...normal, attemptsLeft: 0, nextActionAt: 2 * interval },
      event: { type: 'retried' },
    });

    const { state: settled } = model(config, second.state, fail(requestError, 2 * interval));
    expect(settled.controlState).toBe('FAILING');
    expect(settled.attemptsLeft).toBe(config.healthCheckRetry);
  });

  it('restores the attempts when a compatibility settles', () => {
    const { state: used } = model(config, normal, fail(requestError));
    expect(model(config, used, ok(compatible)).state.attemptsLeft).toBe(config.healthCheckRetry);
  });
});

describe('the initial state', () => {
  it('starts in STARTUP, so a retry waits the startup interval rather than 0', () => {
    const { state: retried } = model(
      config,
      initialState(config, 1_000),
      fail(requestError, 1_000)
    );
    expect(retried.controlState).toBe('STARTUP');
    expect(retried.compatibility).toBeUndefined();
    expect(dueIn(retried, 1_000)).toBe(config.healthCheckStartupInterval);
  });

  it('stays in startup at the normal interval when no startup interval is configured', () => {
    const withoutStartup = { ...config, healthCheckStartupInterval: undefined };
    const { state: retried } = model(
      withoutStartup,
      initialState(withoutStartup, 1_000),
      fail(requestError, 1_000)
    );
    expect(retried.controlState).toBe('STARTUP');
    expect(dueIn(retried, 1_000)).toBe(withoutStartup.healthCheckInterval);
  });
});

describe('the event of a step', () => {
  const normal: NodesVersionState = {
    controlState: 'NORMAL',
    compatibility: compatibilityOf(compatible),
    attemptsLeft: config.healthCheckRetry,
    nextActionAt: 0,
  };

  it('is compatibilityChanged for the first compatibility, whatever it is', () => {
    const { state, event } = model(config, initialState(config, 0), ok(incompatible));
    expect(event).toEqual({ type: 'compatibilityChanged', compatibility: state.compatibility });
  });

  it('is compatibilityUnchanged when the same cluster answers again', () => {
    expect(model(config, normal, ok(compatible)).event).toEqual({ type: 'compatibilityUnchanged' });
  });

  it('is compatibilityChanged when the request starts failing, and again when it recovers', () => {
    const failing = model(config, { ...normal, attemptsLeft: 0 }, fail(requestError));
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
  const log = loggingSystemMock.createLogger();
  beforeEach(() => jest.clearAllMocks());

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
      { ...config, internalClient, log, signal: controller.signal },
      virtualClock()
    );
    const emitted = await lastValueFrom(compatibility$.pipe(toArray()));
    return { compatibility$, emitted };
  };

  it('emits only when the compatibility changes, and completes once aborted', async () => {
    const { emitted } = await poll([compatible, compatible, incompatible]);
    expect(emitted.map((c) => c.isCompatible)).toEqual([true, false]);
  });

  it('replays the latest compatibility to a late subscriber', async () => {
    const { compatibility$ } = await poll([compatible]);
    expect((await firstValueFrom(compatibility$)).isCompatible).toBe(true);
  });

  it('logs an incompatible cluster once per change', async () => {
    await poll([incompatible, incompatible]);
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('7.0.0'));
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
