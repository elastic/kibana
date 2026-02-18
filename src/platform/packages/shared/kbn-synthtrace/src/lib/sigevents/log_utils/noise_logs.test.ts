/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceGraph, ServiceNode } from '../types';
import { generateInfraNoiseLog, generateNoiseDocs } from './noise_logs';

const SEED = 42;
const TIMESTAMP = Date.parse('2023-11-15T00:00:00.000Z');

const alwaysHigh = () => 0.999;

const K8S_SERVICE: ServiceNode = {
  name: 'test-svc',
  runtime: 'node',
  version: '1.0.0',
  infraDeps: ['postgres'],
  deployment: { k8s: { namespace: 'test-ns' } },
};

const HOST_SERVICE: ServiceNode = {
  name: 'test-host-svc',
  runtime: 'python',
  version: '1.0.0',
  infraDeps: ['postgres'],
};

describe('generateInfraNoiseLog — without service (bare fallback)', () => {
  it('returns null for an unknown dep', () => {
    const result = generateInfraNoiseLog({
      dep: 'unknown_dep' as never,
      rng: alwaysHigh,
      seed: SEED,
    });
    expect(result).toBeNull();
  });

  it('returns only log.level and message when no service is provided', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      timestamp: TIMESTAMP,
    });

    expect(doc).not.toBeNull();
    expect(doc!['log.level']).toBeDefined();
    expect(doc!.message).toBeDefined();

    // No service/host/os/k8s metadata should be present
    const raw = doc as Record<string, unknown>;
    expect(doc!['service.name']).toBeUndefined();
    expect(doc!['host.name']).toBeUndefined();
    expect(raw['os.type']).toBeUndefined();
    expect(raw['k8s.pod.name']).toBeUndefined();
  });

  it('emits info level when rng is above all thresholds', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
    });
    expect(doc!['log.level']).toBe('info');
  });

  it('emits warn level when degraded=true and rng lands in warn band', () => {
    // resolveNoiseHealth: degraded=true → rng() < 0.5 → 'degraded'; warn → level='warn'
    const alwaysLow = () => 0.001;
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysLow,
      seed: SEED,
      degraded: true,
    });
    expect(doc!['log.level']).toBe('warn');
  });
});

describe('generateInfraNoiseLog — with service (metadata populated)', () => {
  it('populates service.name from the service node', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      service: K8S_SERVICE,
    });
    expect(doc!['service.name']).toBe(K8S_SERVICE.name);
  });

  it('populates host.name and os.type for a service without k8s', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      service: HOST_SERVICE,
    });
    const raw = doc as Record<string, unknown>;
    expect(doc!['host.name']).toBeDefined();
    expect(doc!['host.name']).not.toBeNull();
    expect(raw['os.type']).toBeDefined();
    expect(raw['os.type']).not.toBeNull();
  });

  it('populates k8s fields for a service with k8s deployment', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      service: K8S_SERVICE,
    });
    const raw = doc as Record<string, unknown>;
    expect(raw['k8s.pod.name']).toBeDefined();
    expect(raw['k8s.pod.name']).not.toBeNull();
    expect(raw['k8s.namespace.name']).toBe('test-ns');
    expect(raw['k8s.node.name']).toBeDefined();
  });

  it('does NOT populate k8s fields for a service without k8s deployment', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      service: HOST_SERVICE,
    });
    const raw = doc as Record<string, unknown>;
    expect(raw['k8s.pod.name']).toBeUndefined();
    expect(raw['k8s.namespace.name']).toBeUndefined();
  });

  it('uses cachedMetadata when provided instead of rebuilding', () => {
    const cachedMetadata = {
      'host.name': 'cached-host',
      'host.id': 'cached-id',
      'os.type': 'linux',
      'os.name': 'Ubuntu',
      'os.version': '22.04',
    };
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      rng: alwaysHigh,
      seed: SEED,
      service: K8S_SERVICE,
      cachedMetadata,
    });
    expect(doc!['host.name']).toBe('cached-host');
  });
});

const GRAPH_WITH_INFRA: ServiceGraph = {
  services: [
    {
      name: 'api',
      runtime: 'node',
      version: '1.0.0',
      infraDeps: ['postgres', 'redis'],
      deployment: { k8s: { namespace: 'prod' } },
    },
    {
      name: 'worker',
      runtime: 'python',
      version: '1.0.0',
      infraDeps: ['kafka'],
    },
  ],
  edges: [{ source: 'api', target: 'worker', protocol: 'http' }],
};

describe('generateNoiseDocs — infra emitter metadata propagation', () => {
  it('infra dep docs carry host.name and service.name (not null/undefined)', () => {
    // Emit a large batch so infra emitters are picked at least a few times
    const docs = generateNoiseDocs({
      serviceGraph: GRAPH_WITH_INFRA,
      count: 200,
      seed: SEED,
      timestamp: TIMESTAMP,
    });

    // Filter docs that look like they came from infra emitters:
    // they have a message matching known infra patterns but still have service.name populated
    const docsWithServiceName = docs.filter((d) => d['service.name'] != null);
    expect(docsWithServiceName.length).toBeGreaterThan(0);

    const docsWithHostName = docs.filter((d) => d['host.name'] != null);
    expect(docsWithHostName.length).toBeGreaterThan(0);

    // No doc should have null host.name or null service.name — only missing (undefined) is ok
    // for the rare unknown-dep fallback which returns null from generateInfraNoiseLog
    const docsWithNullHostName = docs.filter(
      (d) => Object.prototype.hasOwnProperty.call(d, 'host.name') && d['host.name'] === null
    );
    expect(docsWithNullHostName).toHaveLength(0);

    const docsWithNullServiceName = docs.filter(
      (d) => Object.prototype.hasOwnProperty.call(d, 'service.name') && d['service.name'] === null
    );
    expect(docsWithNullServiceName).toHaveLength(0);
  });
});
