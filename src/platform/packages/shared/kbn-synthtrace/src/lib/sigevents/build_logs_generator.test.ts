/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceGraph } from './types';
import { isInfraErrorType } from './types';
import { buildLogsGenerator } from './build_logs_generator';
import { DEFAULT_SERVICE_GRAPH } from './service_graph';

const SEED = 42;
const BASE_TS = Date.parse('2023-11-15T00:00:00.000Z');
const ONE_MIN = 60 * 1_000; // ms

/** Serializes a single generator tick into plain field objects so tests can inspect individual document fields. */
function serializeTick(
  generator: ReturnType<typeof buildLogsGenerator>['generator'],
  timestamp: number,
  index: number
) {
  return generator(timestamp, index).flatMap((entry) => entry.serialize());
}

/** Returns the number of log entries emitted by the first traffic tick. */
function countDocsAtTick(
  graph: ServiceGraph,
  opts: Partial<Parameters<typeof buildLogsGenerator>[0]> = {}
): number {
  const { generator } = buildLogsGenerator({
    tickIntervalMs: ONE_MIN,
    seed: SEED,
    serviceGraph: graph,
    entryService: opts.entryService ?? graph.services[0].name,
    noise: { volume: { rate: 1, jitter: 0 } },
    ...opts,
  });
  return generator(BASE_TS, 0).length;
}

const MINIMAL_GRAPH: ServiceGraph = {
  services: [
    {
      name: 'alpha',
      runtime: 'node',
      version: '1.0.0',
      infraDeps: ['postgres'],
      deployment: { k8s: { namespace: 'test' } },
    },
    {
      name: 'beta',
      runtime: 'java',
      version: '1.0.0',
      infraDeps: ['redis'],
      deployment: { k8s: { namespace: 'test' } },
    },
  ],
  edges: [{ source: 'alpha', target: 'beta', protocol: 'http' }],
};

describe('buildLogsGenerator — volume consistency', () => {
  it('emits exactly 6 docs per non-startup tick on a 2-service / 1-edge graph', () => {
    // 2 self + 2 outbound (initiation + result) + 1 infra + 1 noise = 6, +1 if host log fires (probability 0.005)
    const count = countDocsAtTick(MINIMAL_GRAPH, {
      entryService: 'alpha',
    });
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(7); // +1 optional host log
  });

  it('emits 17-18 docs per tick on the default claims graph and is stable across ticks', () => {
    // 5 self + 10 outbound (5 edges × 2: initiation + result) + 1 infra + 1 noise = 17, +1 if host log fires (probability 0.005)
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: DEFAULT_SERVICE_GRAPH,
      entryService: 'claim-intake',
      noise: { volume: { rate: 1, jitter: 0 } },
    });
    for (let i = 0; i <= 5; i++) {
      const count = generator(BASE_TS + i * ONE_MIN, i).length;
      expect(count).toBeGreaterThanOrEqual(17);
      expect(count).toBeLessThanOrEqual(18);
    }
  });

  it('multiplier scales only service logs: 2×service + infra + noise', () => {
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { alpha: { rate: 2 } },
      noise: { volume: { rate: 1, jitter: 0 } },
    });
    const count = generator(BASE_TS, 0).length;
    // (2 self + 2 outbound) × 2 + 1 infra + 1 noise = 10, +1 if host log fires
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(11);
  });

  it('noise.volume=0 removes noise docs', () => {
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      noise: { volume: { rate: 0, jitter: 0 } },
    });
    const count = generator(BASE_TS, 0).length;
    // 4 service (2 self + 2 outbound) + 1 infra + 0 noise = 5, +1 if host log fires
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(6);
  });

  it('infra docs are always emitted when services have infraDeps', () => {
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      noise: { volume: { rate: 1, jitter: 0 } },
    });
    const count = generator(BASE_TS, 0).length;
    // 4 service (2 self + 2 outbound) + 1 infra + 1 noise = 6, +1 if host log fires
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(7);
  });

  it('volume spike multiplier scales service doc count per tick', () => {
    // Before the burst window: multiplier=1; during: multiplier=3.
    // Service docs = (2 self + 2 outbound) × multiplier; infra + noise stay constant.
    const BURST_OFFSET = 5 * ONE_MIN;
    // spike.start is an absolute timestamp — must be BASE_TS + offset, not just offset.
    const BURST_TS = BASE_TS + BURST_OFFSET;

    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { alpha: { spikes: [{ start: BURST_TS, multiplier: 3 }] } },
      noise: { volume: { rate: 1, jitter: 0 } },
    });

    // Before burst: (2+2)×1 + 1 infra + 1 noise = 6, +1 optional host log
    const beforeCount = generator(BASE_TS, 0).length;
    expect(beforeCount).toBeGreaterThanOrEqual(6);
    expect(beforeCount).toBeLessThanOrEqual(7);

    // During burst: (2+2)×3 + 1 infra + 1 noise = 14, +1 optional host log
    const burstCount = generator(BASE_TS + BURST_OFFSET, 5).length;
    expect(burstCount).toBeGreaterThanOrEqual(14);
    expect(burstCount).toBeLessThanOrEqual(15);

    // Burst count is strictly greater than pre-burst count
    expect(burstCount).toBeGreaterThan(beforeCount);
  });

  it('noise.volume as a function changes noise doc count per tick', () => {
    // Before the burst window: volume=1; during: volume=5.
    // Service + infra docs stay constant; noise scales with the function.
    const BURST_TS = BASE_TS + 5 * ONE_MIN;
    const volumeFn = (ts: number) => (ts >= BURST_TS ? 5 : 1);

    const { generator: withFnGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      noise: { volume: { rate: volumeFn, jitter: 0 } },
    });

    const beforeCount = withFnGen(BASE_TS, 0).length;
    const burstCount = withFnGen(BURST_TS, 5).length;

    // Burst adds 4 extra noise docs (5−1)
    expect(burstCount - beforeCount).toBe(4);
  });

  it('failures may increase volume via pre-failure warn docs on non-error ticks', () => {
    const { generator: noFailuresGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: DEFAULT_SERVICE_GRAPH,
      entryService: 'claim-intake',
      noise: { volume: { rate: 1, jitter: 0 } },
    });
    const { generator: withFailuresGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: DEFAULT_SERVICE_GRAPH,
      entryService: 'claim-intake',
      failures: { infra: { postgres: { errorType: 'db_timeout', rate: 0.8 } } },
      noise: { volume: { rate: 1, jitter: 0 } },
    });
    const noFailuresCount = noFailuresGen(BASE_TS, 0).length;
    const withFailuresCount = withFailuresGen(BASE_TS, 0).length;
    // No failures: 15 svc (self + 10 outbound) + 1 infra + 1 noise + 0-1 host = 17-18
    expect(noFailuresCount).toBeGreaterThanOrEqual(17);
    expect(noFailuresCount).toBeLessThanOrEqual(18);
    // With failures: service docs may decrease (DFS short-circuit), but warn docs may fire
    // on non-error ticks for each postgres-dependent service (claim-intake, policy-lookup,
    // payment-processor). Minimum: infra (1) + noise (1) + at least 1 service doc = 3.
    // Maximum: full service (15) + up to 3 warn docs + infra (1) + host (1) + noise (1) = 21.
    expect(withFailuresCount).toBeGreaterThanOrEqual(3);
    expect(withFailuresCount).toBeLessThanOrEqual(21);
  });
});

describe('buildLogsGenerator — determinism', () => {
  it('produces the same doc count per tick for the same seed', () => {
    const makeGenerator = () =>
      buildLogsGenerator({
        tickIntervalMs: ONE_MIN,
        seed: SEED,
        serviceGraph: DEFAULT_SERVICE_GRAPH,
        entryService: 'claim-intake',
        noise: { volume: { rate: 1, jitter: 0 } },
      }).generator;

    const genA = makeGenerator();
    const genB = makeGenerator();

    for (let i = 0; i <= 3; i++) {
      expect(genA(BASE_TS + i * ONE_MIN, i).length).toBe(genB(BASE_TS + i * ONE_MIN, i).length);
    }
  });
});

describe('buildLogsGenerator — failure co-occurrence', () => {
  it('infra and noise docs are always emitted even when failures reduce service docs', () => {
    // In a high-failure-rate incident, services may skip downstream calls (DFS short-circuit),
    // reducing service docs. But infra (1) + noise (1) must always be present.
    // Minimum expected: infra (1) + noise (1) = 2; in practice service docs still > 0.
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: DEFAULT_SERVICE_GRAPH,
      entryService: 'claim-intake',
      failures: { infra: { postgres: { errorType: 'db_timeout', rate: 1 } } },
      noise: { volume: { rate: 1, jitter: 0 } },
    });

    let totalDocs = 0;
    const TICKS = 5;
    for (let i = 0; i < TICKS; i++) {
      const count = generator(BASE_TS + i * ONE_MIN, i).length;
      // At minimum: 1 infra + 1 noise = 2; in practice there will be more
      expect(count).toBeGreaterThanOrEqual(2);
      totalDocs += count;
    }
    // Over 5 ticks, total must be well above just the minimum 2/tick baseline
    expect(totalDocs).toBeGreaterThanOrEqual(TICKS * 5);
  });
});

describe('buildLogsGenerator — scenario isolation (hostPhase)', () => {
  it.each([
    ['db_timeout', false],
    ['internal_error', false],
    ['gateway_timeout', false],
    ['bad_gateway', false],
    ['k8s_oom', true],
    ['k8s_crash_loop_back', true],
    ['message_queue_failure', true],
    ['cache_failure', true],
  ] as const)('isInfraErrorType(%s) === %s', (errorType, expected) => {
    expect(isInfraErrorType(errorType)).toBe(expected);
  });
});

describe('buildLogsGenerator — service channel volume', () => {
  it('volume.rate={beta:0} silences the skew channel for beta, but graph-trace docs are still emitted', () => {
    // rate={beta:0} suppresses the skew doc but the DFS graph trace still produces beta docs.
    const { generator: withExtraGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { beta: { rate: 1 } },
      noise: { volume: { rate: 0, jitter: 0 } },
    });
    const { generator: suppressedGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { beta: { rate: 0 } },
      noise: { volume: { rate: 0, jitter: 0 } },
    });

    const withExtraDocs = serializeTick(withExtraGen, BASE_TS, 0);
    const suppressedDocs = serializeTick(suppressedGen, BASE_TS, 0);

    // The 1 skew-channel doc is suppressed
    expect(suppressedDocs.length).toBe(withExtraDocs.length - 1);

    // But beta still appears via the graph trace
    const suppressedBeta = suppressedDocs.filter((d) => d['service.name'] === 'beta').length;
    expect(suppressedBeta).toBeGreaterThan(0);
  });

  it('volume.every gates DFS trace + skew to every N-th tick', () => {
    // every:STRIDE fires collectServiceDocs + the skew channel on ticks where index % STRIDE === 0.
    // On non-stride ticks only infra fires (≤2 docs); on stride ticks DFS+skew+infra fires (≥6 docs).
    const TICKS = 50;
    const STRIDE = 5;
    const { generator } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { alpha: { every: STRIDE }, beta: { rate: 1, every: STRIDE } },
      noise: { volume: { rate: 0, jitter: 0 } },
    });

    const counts: number[] = [];
    for (let i = 0; i < TICKS; i++) {
      counts.push(generator(BASE_TS + i * ONE_MIN, i).length);
    }

    // Non-stride ticks produce only infra (1 doc) + optional host log (at most 2).
    // DFS trace for MINIMAL_GRAPH produces ≥4 docs, so stride ticks always exceed 2.
    const NON_STRIDE_MAX = 2;
    const strideTicks = counts.filter((c) => c > NON_STRIDE_MAX).length;

    // every=5 over 50 ticks → fires on ticks 0,5,10,…,45 = exactly 10 ticks
    expect(strideTicks).toBe(TICKS / STRIDE);
  });

  it('volume.rate={beta:1} emits 1 extra beta doc on every tick', () => {
    const { generator: baseGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      noise: { volume: { rate: 0, jitter: 0 } },
    });
    const { generator: skewGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { beta: { rate: 1 } },
      noise: { volume: { rate: 0, jitter: 0 } },
    });
    for (let i = 0; i < 10; i++) {
      const ts = BASE_TS + i * ONE_MIN;
      const baseDocs = serializeTick(baseGen, ts, i);
      const skewDocs = serializeTick(skewGen, ts, i);

      // Exactly 1 extra doc overall
      expect(skewDocs.length - baseDocs.length).toBe(1);

      // The extra doc belongs to beta
      const baseBeta = baseDocs.filter((d) => d['service.name'] === 'beta').length;
      const skewBeta = skewDocs.filter((d) => d['service.name'] === 'beta').length;
      expect(skewBeta - baseBeta).toBe(1);
    }
  });

  it('volume.rate={beta:0.3} emits beta skew docs on only a fraction of ticks', () => {
    const TICKS = 200;
    const SHARE = 0.3;
    const { generator: baseGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      noise: { volume: { rate: 0, jitter: 0 } },
    });
    const { generator: skewGen } = buildLogsGenerator({
      tickIntervalMs: ONE_MIN,
      seed: SEED,
      serviceGraph: MINIMAL_GRAPH,
      entryService: 'alpha',
      volume: { beta: { rate: SHARE } },
      noise: { volume: { rate: 0, jitter: 0 } },
    });

    let ticksWithExtraBeta = 0;
    for (let i = 0; i < TICKS; i++) {
      const ts = BASE_TS + i * ONE_MIN;
      const baseDocs = serializeTick(baseGen, ts, i);
      const skewDocs = serializeTick(skewGen, ts, i);

      const baseBeta = baseDocs.filter((d) => d['service.name'] === 'beta').length;
      const skewBeta = skewDocs.filter((d) => d['service.name'] === 'beta').length;

      if (skewBeta > baseBeta) {
        expect(skewBeta - baseBeta).toBe(1);
        ticksWithExtraBeta++;
      }
    }
    // share=0.3 over 200 ticks → ~60 ± generous tolerance
    expect(ticksWithExtraBeta).toBeGreaterThan(20);
    expect(ticksWithExtraBeta).toBeLessThan(100);
  });

  it('skew channel is deterministic: same seed yields same emission pattern', () => {
    const makeGen = () =>
      buildLogsGenerator({
        tickIntervalMs: ONE_MIN,
        seed: SEED,
        serviceGraph: MINIMAL_GRAPH,
        entryService: 'alpha',
        volume: { beta: { rate: 0.5 } },
        noise: { volume: { rate: 0, jitter: 0 } },
      }).generator;

    const genA = makeGen();
    const genB = makeGen();
    for (let i = 0; i < 10; i++) {
      expect(genA(BASE_TS + i * ONE_MIN, i).length).toBe(genB(BASE_TS + i * ONE_MIN, i).length);
    }
  });
});
