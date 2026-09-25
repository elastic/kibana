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
  type NodesVersionEvent,
  type NodesVersionConfig,
  type NodesVersionControlState,
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
const errorOutcome: RequestOutcome = { nodes: {}, nodesInfoRequestError: requestError };

const compatibilityOf = (outcome: RequestOutcome) =>
  mapNodesVersionCompatibility(outcome, config.kibanaVersion, config.ignoreVersionMismatch);

/**
 * Keyed rather than listed, so the compiler rejects the enumeration if the
 * union grows. `model` picks its output from string literals, so nothing else
 * forces a new control state to be covered here.
 */
const keysOf = <T extends string>(members: Record<T, true>): T[] => Object.keys(members) as T[];

const CONTROL_STATES = keysOf<NodesVersionControlState>({
  STARTUP: true,
  NORMAL: true,
  FAILING: true,
});

/**
 * N, the next-state relation, as a predicate over the unprimed state, the
 * result, and the primed state: a step either uses an attempt and settles
 * nothing, or settles a compatibility and restores the attempts. Either way it lands
 * on the unique grid point strictly after completion, on the grid anchored at
 * the time the request that just ran was due, with the interval of the
 * primed control state. One scheduling policy, so one grid predicate.
 *
 * This is the test's oracle, and it deliberately restates the policy instead of
 * importing anything `model` uses. A relation that shares a helper with the
 * step function is a tautology: it moves with the bug rather than catching it.
 * Stating it twice is what makes the assertion an assertion. Keep it
 * independent.
 */
const satisfiesNext =
  (cfg: NodesVersionConfig) =>
  (state: NodesVersionState, result: NodesVersionResult, primed: NodesVersionState): boolean => {
    const intervalOf = (controlState: NodesVersionControlState): number =>
      ({
        STARTUP: cfg.healthCheckStartupInterval ?? cfg.healthCheckInterval,
        FAILING: cfg.healthCheckFailureInterval ?? cfg.healthCheckInterval,
        NORMAL: cfg.healthCheckInterval,
      }[controlState]);

    const interval = intervalOf(primed.controlState);
    const onGrid =
      primed.nextActionAt > result.completedAt && // strictly into the future (non-Zeno)
      primed.nextActionAt - result.completedAt <= interval && // the first such grid point
      (primed.nextActionAt - state.nextActionAt) % interval === 0; // anchored at the due time
    if (!onGrid) {
      return false;
    }

    const usesAnAttempt =
      !result.ok &&
      state.attemptsLeft > 0 &&
      primed.attemptsLeft === state.attemptsLeft - 1 &&
      primed.compatibility === state.compatibility &&
      primed.controlState === state.controlState;

    if (usesAnAttempt) {
      return true;
    }

    const compatibility = primed.compatibility;
    if (compatibility === undefined || primed.attemptsLeft !== cfg.healthCheckRetry) {
      return false;
    }

    const isIncompatible = compatibility.isCompatible === false;
    const stillStarting = state.controlState === 'STARTUP' && isIncompatible;
    const requestFailed = compatibility.nodesInfoRequestError !== undefined;

    switch (primed.controlState) {
      case 'STARTUP':
        return stillStarting;
      case 'FAILING':
        return !stillStarting && requestFailed;
      case 'NORMAL':
        return !stillStarting && !requestFailed;
    }
  };

/**
 * The event of a step, as a predicate over the unprimed state, the primed
 * state, and the event: a step that used an attempt is `retried`; a
 * step that settled reports whether its compatibility differs from the one it left,
 * and a first compatibility always differs. Structural only: what "differs" means is
 * asserted directly on `sameCompatibility` below, since restating it here
 * would only copy it.
 */
const eventAgrees = (
  state: NodesVersionState,
  primed: NodesVersionState,
  event: NodesVersionEvent
): boolean => {
  if (primed.attemptsLeft < state.attemptsLeft) {
    return event.type === 'retried';
  }
  if (primed.compatibility === undefined) {
    return false;
  }
  if (state.compatibility === undefined) {
    return event.type === 'compatibilityChanged' && event.compatibility === primed.compatibility;
  }
  return event.type === 'compatibilityChanged'
    ? event.compatibility === primed.compatibility
    : event.type === 'compatibilityUnchanged';
};

const inRelation = satisfiesNext(config);

/** How long after the request that produced it this state schedules the next one. */
const dueIn = (state: NodesVersionState, completedAt = 0): number =>
  state.nextActionAt - completedAt;

describe('the substitution: agreement with pollEsNodesVersion under Psi', () => {
  // The upstream machine's state: two booleans set by the `tap`.
  interface RxjsState {
    isStartup: boolean;
    isCheckFailing: boolean;
  }

  const rxjsNext = (state: RxjsState, outcome: RequestOutcome): RxjsState => {
    const compatibility = compatibilityOf(outcome);
    return {
      isStartup: compatibility.isCompatible ? false : state.isStartup,
      isCheckFailing: !!compatibility.nodesInfoRequestError,
    };
  };

  const psi = ({ isStartup, isCheckFailing }: RxjsState): NodesVersionControlState => {
    if (isStartup) return 'STARTUP';
    return isCheckFailing ? 'FAILING' : 'NORMAL';
  };

  const RXJS_STATES: RxjsState[] = [
    { isStartup: true, isCheckFailing: true },
    { isStartup: true, isCheckFailing: false },
    { isStartup: false, isCheckFailing: true },
    { isStartup: false, isCheckFailing: false },
  ];

  it.each<[string, RequestOutcome, NodesVersionResult]>([
    ['a compatible compatibility', compatible, ok(compatible)],
    ['an incompatible but reachable cluster', incompatible, ok(incompatible)],
    ['a request error', errorOutcome, fail(requestError)],
  ])('Psi(rxjsNext(s, %s)) === nextControlState(Psi(s), ...)', (_label, outcome, result) => {
    for (const upstream of RXJS_STATES) {
      const ported: NodesVersionState = {
        controlState: psi(upstream),
        compatibility: undefined,
        nextActionAt: 0,
        // No retry attempts, so a request error settles immediately and the
        // step is comparable with the upstream one.
        attemptsLeft: 0,
      };

      expect(model(config, ported, result).state.controlState).toBe(
        psi(rxjsNext(upstream, outcome))
      );
    }
  });

  it('<true, true> is reachable and legal upstream, not an illegal fourth combination', () => {
    // Startup + a failed request. Upstream resolves it to the startup interval.
    expect(psi({ isStartup: true, isCheckFailing: true })).toBe('STARTUP');
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

describe('one scheduling policy', () => {
  const normal: NodesVersionState = {
    controlState: 'NORMAL',
    compatibility: compatibilityOf(compatible),
    attemptsLeft: config.healthCheckRetry,
    nextActionAt: 1_000,
  };
  const { healthCheckInterval: interval } = config;

  it('a retry stays on the grid anchored at the failed request, like a settle', () => {
    // Due at 1000, failed at 1400 after a slow request. v3 would retry at
    // 1400 + interval; the grid point is 1000 + interval.
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

describe('S2: every step is in the next-state relation', () => {
  // Every kind of result the policy distinguishes, plus a warning-only
  // cluster and an empty response that carries no error. Completions on the
  // the due time, shortly after it, and past a whole interval.
  const OUTCOMES: Array<NodesInfo | Error> = [
    compatible,
    incompatible,
    { nodes: { a: { version: '8.9.0', ip: '1.1.1.1', name: 'a' } } }, // warning only
    { nodes: {} }, // empty, no request error
    requestError,
  ];
  const COMPLETED_AT = [0, 7, 3_000];
  const RESULTS: NodesVersionResult[] = OUTCOMES.flatMap((outcome) =>
    COMPLETED_AT.map((at) => (outcome instanceof Error ? fail(outcome, at) : ok(outcome, at)))
  );

  const PRIOR_COMPATIBILITIES = [
    undefined,
    compatibilityOf(compatible),
    compatibilityOf(errorOutcome),
  ];

  const statesOf = (cfg: NodesVersionConfig): NodesVersionState[] => {
    const states: NodesVersionState[] = [];
    for (const controlState of CONTROL_STATES) {
      for (let attemptsLeft = 0; attemptsLeft <= cfg.healthCheckRetry; attemptsLeft++) {
        for (const compatibility of PRIOR_COMPATIBILITIES) {
          states.push({ controlState, compatibility, attemptsLeft, nextActionAt: 0 });
        }
      }
    }
    return states;
  };

  it.each([
    ['with a startup interval', config],
    ['without a startup interval', { ...config, healthCheckStartupInterval: undefined }],
  ])('every step of the model is in the relation, %s', (_label, cfg) => {
    const holds = satisfiesNext(cfg);

    for (const state of statesOf(cfg)) {
      for (const result of RESULTS) {
        const { state: primed, event } = model(cfg, state, result);
        expect({
          state,
          result,
          inRelation: holds(state, result, primed),
          eventAgrees: eventAgrees(state, primed, event),
        }).toEqual({ state, result, inRelation: true, eventAgrees: true });
      }
    }
  });

  it('rejects a pair that uses an attempt and settles a compatibility at once', () => {
    const normal: NodesVersionState = {
      controlState: 'NORMAL',
      compatibility: compatibilityOf(compatible),
      attemptsLeft: 2,
      nextActionAt: 0,
    };
    expect(
      inRelation(normal, fail(requestError), {
        ...normal,
        compatibility: compatibilityOf(incompatible),
        attemptsLeft: 1,
        nextActionAt: config.healthCheckInterval,
      })
    ).toBe(false);
  });

  it('rejects a retry scheduled at a fixed delay from the failed request', () => {
    const normal: NodesVersionState = {
      controlState: 'NORMAL',
      compatibility: compatibilityOf(compatible),
      attemptsLeft: 2,
      nextActionAt: 1_000,
    };
    expect(
      inRelation(normal, fail(requestError, 1_400), {
        ...normal,
        attemptsLeft: 1,
        nextActionAt: 1_400 + config.healthCheckInterval,
      })
    ).toBe(false);
  });
});

describe('the schedule is readable from the states', () => {
  it('spaces requests by the interval of the state each one produced', () => {
    let state = initialState(config, 0);
    const due: Array<[NodesVersionControlState, number]> = [];

    // Each request settles at exactly the instant it was due: no drift, no clock.
    const requests: Array<NodesInfo | Error> = [
      requestError, // retried while starting
      compatible,
      incompatible, // reachable, wrong version
      requestError, // retry 1 of 2
      requestError, // retry 2 of 2
      requestError, // attempts used, settles
    ];

    for (const request of requests) {
      const clock = state.nextActionAt;
      const result = request instanceof Error ? fail(request, clock) : ok(request, clock);
      state = model(config, state, result).state;
      due.push([state.controlState, dueIn(state, clock)]);
    }

    const { healthCheckStartupInterval, healthCheckInterval, healthCheckFailureInterval } = config;
    expect(due).toEqual([
      ['STARTUP', healthCheckStartupInterval],
      ['NORMAL', healthCheckInterval],
      ['NORMAL', healthCheckInterval],
      // Retries hold the current interval, as upstream's `timer(currentInterval)` does.
      ['NORMAL', healthCheckInterval],
      ['NORMAL', healthCheckInterval],
      ['FAILING', healthCheckFailureInterval],
    ]);
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
