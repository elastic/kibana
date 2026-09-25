/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  fetchNodesInfo,
  initialState,
  model,
  sameCompatibility,
  type NodesVersionResult,
  type NodesVersionConfig,
  type NodesVersionState,
} from './nodes_version';
import {
  mapNodesVersionCompatibility,
  type NodesInfo,
  type NodesVersionCompatibility,
} from './nodes_version_compatibility';

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

describe('one scheduling policy', () => {
  const normal: NodesVersionState = {
    controlState: 'NORMAL',
    compatibility: compatibilityOf(compatible),
    attemptsLeft: config.healthCheckRetry,
    nextActionAt: 1_000,
  };
  const { healthCheckInterval: interval } = config;

  it('a retry stays on the grid anchored at the failed request, like a settle', () => {
    // Due at 1000, failed at 1400 after a slow request. A fixed delay would
    // retry at 1400 + interval; the grid point is 1000 + interval.
    const { state: retried } = model(config, normal, fail(requestError, 1_400));
    const { state: settled } = model(
      config,
      { ...normal, attemptsLeft: 0 },
      fail(requestError, 1_400)
    );

    expect(retried.nextActionAt).toBe(1_000 + interval);
    expect(settled.nextActionAt).toBe(1_000 + config.healthCheckFailureInterval);
  });

  it('a retry skips the grid points a slow request overran', () => {
    const { state: retried } = model(config, normal, fail(requestError, 1_000 + 2 * interval + 1));
    expect(retried.nextActionAt).toBe(1_000 + 3 * interval);
  });
});

describe('the initial state', () => {
  it('schedules the first request when the machine starts', () => {
    expect(initialState(config, 1_000).nextActionAt).toBe(1_000);
  });

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

  it('is compatibilityChanged when a node changes version', () => {
    const { state, event } = model(config, normal, ok(incompatible));
    expect(event).toEqual({ type: 'compatibilityChanged', compatibility: state.compatibility });
  });

  it('is compatibilityChanged when the request starts failing, and again when it recovers', () => {
    const failing = model(config, { ...normal, attemptsLeft: 0 }, fail(requestError));
    expect(failing.event.type).toBe('compatibilityChanged');

    const recovered = model(config, failing.state, ok(compatible));
    expect(recovered.event.type).toBe('compatibilityChanged');
  });

  it('is compatibilityUnchanged when the same error settles again', () => {
    const failing = model(config, { ...normal, attemptsLeft: 0 }, fail(requestError));
    // A settle restores the attempts, so use them again to settle the repeat.
    const again = model(
      config,
      { ...failing.state, attemptsLeft: 0 },
      fail(new Error(requestError.message))
    );
    expect(again.event).toEqual({ type: 'compatibilityUnchanged' });
  });

  it('is retried while attempts remain, and the compatibility it keeps is not re-announced', () => {
    const { state: used, event } = model(config, normal, fail(requestError));
    expect(event).toEqual({ type: 'retried' });
    expect(model(config, used, ok(compatible)).event).toEqual({ type: 'compatibilityUnchanged' });
  });
});

describe('sameCompatibility', () => {
  const withError = (message: string): NodesVersionCompatibility =>
    compatibilityOf({ nodes: {}, nodesInfoRequestError: new Error(message) });

  it('treats two compatibilities of the same cluster as equal', () => {
    expect(sameCompatibility(compatibilityOf(compatible), compatibilityOf(compatible))).toBe(true);
  });

  it('distinguishes a changed node version', () => {
    expect(sameCompatibility(compatibilityOf(compatible), compatibilityOf(incompatible))).toBe(
      false
    );
  });

  it('distinguishes errors by message only', () => {
    expect(sameCompatibility(withError('boom'), withError('boom'))).toBe(true);
    expect(sameCompatibility(withError('boom'), withError('bang'))).toBe(false);
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
