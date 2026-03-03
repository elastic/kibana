/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceFailure } from '../../lib/service_graph_logs/types';
import { parseOpts, makePhaseContext, incidentAt } from './utils';

const BASE_TS = Date.parse('2024-01-01T00:00:00.000Z');
const ONE_MIN_MS = 60_000;

const DB_FAILURE: ServiceFailure = { errorType: 'db_timeout', rate: 1 };
const CACHE_FAILURE: ServiceFailure = { errorType: 'cache_failure', rate: 1 };

describe('parseOpts', () => {
  it('returns correct defaults when called with no opts', () => {
    const result = parseOpts(undefined);
    expect(Number.isFinite(result.seed)).toBe(true);
    expect(result.baselineMinutes).toBe(0);
    expect(result.mockApp).toBe('default');
    expect(result.baseRate).toBe(1);
    expect(result.scenario).toBeUndefined();
  });

  it('parses all explicit options', () => {
    const result = parseOpts({
      seed: '42',
      baselineMinutes: '30',
      baseRate: '2',
      mockApp: 'ecommerce',
      scenario: 'peak',
    });
    expect(result).toMatchObject({
      seed: 42,
      baselineMinutes: 30,
      baseRate: 2,
      mockApp: 'ecommerce',
      scenario: 'peak',
    });
  });

  it('throws on invalid seed', () => {
    expect(() => parseOpts({ seed: 'abc' })).toThrow(/seed/);
  });

  it('throws on negative baselineMinutes', () => {
    expect(() => parseOpts({ baselineMinutes: '-1' })).toThrow(/baselineMinutes/);
  });

  it('throws on zero or negative baseRate', () => {
    expect(() => parseOpts({ baseRate: '0' })).toThrow(/baseRate/);
  });
});

describe('makePhaseContext', () => {
  const { phase, phases } = makePhaseContext(incidentAt(BASE_TS, 0));
  const T0 = BASE_TS;
  const T5 = BASE_TS + 5 * ONE_MIN_MS;
  const T10 = BASE_TS + 10 * ONE_MIN_MS;
  const T15 = BASE_TS + 15 * ONE_MIN_MS;

  it('phase() produces a time-gated volume spike', () => {
    const result = phase('0m', '5m', { volume: { alpha: { scale: 3 } } });
    expect(result.volume?.alpha?.spikes).toEqual([{ start: T0, end: T5, scale: 3 }]);
  });

  it('phase() produces a time-gated failures function', () => {
    const failureMap = { infra: { postgres: DB_FAILURE } };
    const { failures } = phase('0m', '5m', { failures: failureMap });
    const fn = failures as (ts: number) => typeof failureMap | undefined;
    expect(fn(T0)).toBe(failureMap);
    expect(fn(T5)).toBeUndefined();
  });

  it('phases() concatenates volume spikes for the same key', () => {
    const merged = phases([
      phase('0m', '5m', { volume: { alpha: { scale: 2 } } }),
      phase('10m', '15m', { volume: { alpha: { scale: 4 } } }),
    ]);
    expect(merged.volume?.alpha?.spikes).toEqual([
      { start: T0, end: T5, scale: 2 },
      { start: T10, end: T15, scale: 4 },
    ]);
  });

  it('phases() de-duplicates ghostMentions by message', () => {
    const ghost = { message: 'redis timeout' };
    const merged = phases([
      { ghostMentions: [ghost] },
      { ghostMentions: [ghost, { message: 'kafka lag' }] },
    ]);
    expect(merged.ghostMentions?.map((g) => g.message)).toEqual(['redis timeout', 'kafka lag']);
  });

  it('phases() failure fn returns first matching phase map', () => {
    const mapA = { infra: { postgres: DB_FAILURE } };
    const mapB = { infra: { redis: CACHE_FAILURE } };
    const { failures } = phases([
      phase('0m', '5m', { failures: mapA }),
      phase('5m', '10m', { failures: mapB }),
    ]);
    const fn = failures as (ts: number) => unknown;
    expect(fn(T0)).toBe(mapA);
    expect(fn(T5)).toBe(mapB);
    expect(fn(T10)).toBeUndefined();
  });
});
