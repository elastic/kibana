/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InfraDependency, ServiceNode } from '../types';
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

/** An rng that always returns a fixed value — controls all probability rolls deterministically. */
const alwaysLow = () => 0.001; // below every threshold → always picks error/warn tier
const alwaysHigh = () => 0.999; // above every threshold → always healthy

const SEED = 42;
const TIMESTAMP = 1_700_000_000_000;

describe('generateInfraLog — log consistency', () => {
  it('returns null for an unknown/missing dep', () => {
    const result = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'unknown_dep' as InfraDependency,
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
    });
    expect(result).toBeNull();
  });

  it('produces info level when roll is above all thresholds (not failing)', () => {
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
    });
    expect(doc?.['log.level']).toBe('info');
  });

  it('produces warn level when roll falls in warn band while dep is failing', () => {
    // FAILING_PROBS: error < 0.4, warn < 0.65 -> roll=0.5 -> warn
    const roll50 = (() => {
      let calls = 0;
      return () => (calls++ === 0 ? 0.5 : 0.5); // first roll = 0.5
    })();
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: roll50,
      seed: SEED,
      isFailing: true,
      timestamp: TIMESTAMP,
    });
    expect(doc?.['log.level']).toBe('warn');
  });

  it('produces error level when roll falls in error band while dep is failing', () => {
    // FAILING_PROBS: error < 0.4 -> alwaysLow (0.001) -> error
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysLow,
      seed: SEED,
      isFailing: true,
      timestamp: TIMESTAMP,
    });
    expect(doc?.['log.level']).toBe('error');
  });
});

describe('generateInfraLog — failure consistency', () => {
  it('postgres error message comes from connection_refused template, NOT slow-query template', () => {
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
      failingErrorType: 'db_timeout',
    });
    const msg = doc?.message ?? '';
    // connection_refused templates contain "connection" or "FATAL"
    expect(msg.toLowerCase()).toMatch(/connection|fatal/);
    // slow-query templates contain "duration" — must NOT appear in an error-tier log
    expect(msg.toLowerCase()).not.toContain('duration');
  });

  it('kafka error message comes from broker_down template, NOT consumer lag template', () => {
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'kafka',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
      failingErrorType: 'message_queue_failure',
    });
    const msg = doc?.message ?? '';
    expect(msg.toLowerCase()).toMatch(/broker|connection/);
    // lag templates contain "lag" — must NOT appear in an error-tier log
    expect(msg.toLowerCase()).not.toContain('lag=');
  });

  it('redis error message comes from connection_error template, NOT eviction template', () => {
    const doc = generateInfraLog({
      service: K8S_SERVICE,
      infraDep: 'redis',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
      failingErrorType: 'cache_failure',
    });
    const msg = doc?.message ?? '';
    expect(msg.toLowerCase()).toMatch(/connection|econnrefused/);
    // eviction templates contain "evict" or "OOM command" — must NOT appear
    expect(msg.toLowerCase()).not.toMatch(/evict|keys evicted/);
  });

  it('all infraDep types emit error level when failingErrorType is set', () => {
    const deps = ['postgres', 'kafka', 'redis'] as const;
    const errorTypes = ['db_timeout', 'message_queue_failure', 'cache_failure'] as const;
    deps.forEach((dep, i) => {
      const doc = generateInfraLog({
        service: K8S_SERVICE,
        infraDep: dep,
        rng: alwaysHigh,
        seed: SEED + i,
        timestamp: TIMESTAMP,
        failingErrorType: errorTypes[i],
      });
      expect(doc?.['log.level']).toBe('error');
    });
  });
});

describe('generateHostSystemLog — correctness', () => {
  it('emits error level with OOMKill kubelet message when errorType is k8s_oom', () => {
    const doc = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: TIMESTAMP,
      errorType: 'k8s_oom',
    });
    expect(doc?.['log.level']).toBe('error');
    expect(doc?.message?.toLowerCase()).toMatch(/oom|memory/);
    expect(doc?.message?.toLowerCase()).toMatch(/kubelet|kube/);
  });

  it('emits error level with CrashLoopBackOff message when errorType is k8s_crash_loop_back', () => {
    const doc = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: TIMESTAMP,
      errorType: 'k8s_crash_loop_back',
    });
    expect(doc?.['log.level']).toBe('error');
    // kubelet logs both "back-off restarting" and "Started container" during a crash loop
    expect(doc?.message?.toLowerCase()).toMatch(/back-off|crashing|crash|restart|started/);
  });

  it('emits info level (not error) when errorType is undefined', () => {
    const doc = generateHostSystemLog({
      service: K8S_SERVICE,
      seed: SEED,
      timestamp: TIMESTAMP,
      errorType: undefined,
    });
    // level must NOT be error — k8s_oom error condition must never fire without declarations
    expect(doc?.['log.level']).not.toBe('error');
  });

  it('emits a host message (not kubelet) for a bare-metal service', () => {
    const doc = generateHostSystemLog({
      service: HOST_SERVICE,
      seed: SEED,
      timestamp: TIMESTAMP,
      errorType: undefined,
    });
    expect(doc?.message?.toLowerCase()).not.toContain('kubelet');
  });
});
