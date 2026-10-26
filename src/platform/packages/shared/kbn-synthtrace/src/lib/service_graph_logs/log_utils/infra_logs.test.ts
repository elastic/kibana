/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDependency, ServiceNode } from '../types';
import { isInfraErrorType } from '../types';
import { generateHostSystemLog, generateInfraLog } from './infra_logs';

const K8S_SERVICE: ServiceNode = {
  name: 'test-k8s',
  runtime: 'node',
  version: '1.0.0',
  infraDeps: ['postgres', 'kafka', 'redis'],
  deployment: { k8s: { namespace: 'test' } },
};

const HOST_SERVICE: ServiceNode = {
  name: 'test-host',
  runtime: 'python',
  version: '1.0.0',
  infraDeps: ['postgres'],
};

const alwaysLow = () => 0.001; // below every threshold → always error/warn tier
const alwaysHigh = () => 0.999; // above every threshold → always healthy

const SEED = 42;
const BASE_TS = Date.parse('2023-11-15T00:00:00.000Z');

describe('generateInfraLog — log consistency', () => {
  it('returns empty array for an unknown/missing dep', () => {
    const result = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'unknown_dep' as InfraDependency,
      rng: alwaysHigh,
      seed: SEED,
      timestamp: BASE_TS,
    });
    expect(result).toHaveLength(0);
  });

  it('produces info level when roll is above all thresholds (not failing)', () => {
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: BASE_TS,
    });
    expect(doc?.['log.level']).toBe('info');
  });

  it('produces warn level when roll falls in warn band while dep is failing', () => {
    // HEALTH_PROBS.failing: error < 0.15, warn < 0.65 → roll=0.5 → warn
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: () => 0.5,
      seed: SEED,
      isFailing: true,
      timestamp: BASE_TS,
    });
    expect(doc?.['log.level']).toBe('warn');
  });

  it('produces error level when roll falls below error threshold while dep is failing', () => {
    // HEALTH_PROBS.failing: error < 0.15 → roll=0.001 → error
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysLow,
      seed: SEED,
      isFailing: true,
      timestamp: BASE_TS,
    });
    expect(doc?.['log.level']).toBe('error');
  });

  it('produces info level when roll is above all failing thresholds', () => {
    // HEALTH_PROBS.failing: warn < 0.65 → roll=0.8 → info even when failing
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: () => 0.8,
      seed: SEED,
      isFailing: true,
      timestamp: BASE_TS,
    });
    expect(doc?.['log.level']).toBe('info');
  });
});

describe('generateInfraLog — failure consistency', () => {
  it('postgres error message comes from db_timeout.error pool, NOT db_timeout.warn (slow-query) pool', () => {
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: BASE_TS,
      failingErrorType: 'db_timeout',
    });
    const msg = doc?.message ?? '';
    expect(msg.toLowerCase()).toMatch(/connection|fatal/);
    expect(msg.toLowerCase()).not.toContain('duration'); // slow-query pool must not appear
  });

  it('kafka error message comes from broker_down.error pool, NOT broker_down.warn (ISR lag) pool', () => {
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'kafka',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: BASE_TS,
      failingErrorType: 'message_queue_failure',
    });
    const msg = doc?.message ?? '';
    expect(msg.toLowerCase()).toMatch(/broker|connection/);
    expect(msg.toLowerCase()).not.toContain('lag='); // ISR lag pool must not appear
  });

  it('redis error message comes from eviction.error pool, NOT eviction.warn (OOM command) pool', () => {
    const [doc] = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'redis',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: BASE_TS,
      failingErrorType: 'cache_failure',
    });
    const msg = doc?.message ?? '';
    expect(msg.toLowerCase()).toMatch(/connection|econnrefused/);
    expect(msg.toLowerCase()).not.toMatch(/evict|keys evicted/); // eviction pool must not appear
  });

  it('all infraDep types emit error level when failingErrorType is set (overrides probabilistic roll)', () => {
    const deps = ['postgres', 'kafka', 'redis'] as const;
    const errorTypes = ['db_timeout', 'message_queue_failure', 'cache_failure'] as const;
    deps.forEach((dep, i) => {
      const [doc] = generateInfraLog({
        service: K8S_SERVICE,
        infraDep: dep,
        rng: alwaysHigh,
        seed: SEED + i,
        timestamp: BASE_TS,
        failingErrorType: errorTypes[i],
      });
      expect(doc?.['log.level']).toBe('error');
    });
  });
});

describe('generateHostSystemLog — correctness', () => {
  it('emits warn + error docs with OOM-specific kubelet messages when errorType is k8s_oom', () => {
    const docs = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: BASE_TS,
      errorType: 'k8s_oom',
    });
    expect(docs).toHaveLength(2);
    const [warnDoc, errorDoc] = docs;
    expect(warnDoc['log.level']).toBe('warn');
    expect(warnDoc.message?.toLowerCase()).toMatch(/eviction|memory/);
    expect(errorDoc['log.level']).toBe('error');
    expect(errorDoc.message?.toLowerCase()).toMatch(/oom|memory/);
  });

  it('emits warn + error docs with crash-loop-specific kubelet messages when errorType is k8s_crash_loop_backoff', () => {
    const docs = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: BASE_TS,
      errorType: 'k8s_crash_loop_backoff',
    });
    expect(docs).toHaveLength(2);
    const [warnDoc, errorDoc] = docs;
    expect(warnDoc['log.level']).toBe('warn');
    expect(warnDoc.message?.toLowerCase()).toMatch(/terminated|not running/);
    expect(errorDoc['log.level']).toBe('error');
    expect(errorDoc.message?.toLowerCase()).toMatch(/back-off|restart|started/);
  });

  it('emits a single info doc when errorType is undefined', () => {
    const docs = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: BASE_TS,
      errorType: undefined,
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]['log.level']).toBe('info');
  });

  it('emits a host message (not kubelet) for a bare-metal service', () => {
    const docs = generateHostSystemLog({
      service: HOST_SERVICE,
      seed: SEED,
      timestamp: BASE_TS,
      errorType: undefined,
    });
    expect(docs[0].message?.toLowerCase()).not.toContain('kubelet');
  });
});

describe('isInfraErrorType', () => {
  it.each([
    ['db_timeout', false],
    ['internal_error', false],
    ['gateway_timeout', false],
    ['bad_gateway', false],
    ['k8s_oom', true],
    ['k8s_crash_loop_backoff', true],
    ['message_queue_failure', true],
    ['cache_failure', true],
  ] as const)('isInfraErrorType(%s) === %s', (errorType, expected) => {
    expect(isInfraErrorType(errorType)).toBe(expected);
  });
});
