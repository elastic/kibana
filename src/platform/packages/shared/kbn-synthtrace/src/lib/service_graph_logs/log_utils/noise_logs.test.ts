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

describe('generateInfraNoiseLog', () => {
  it('returns null for an unknown dep', () => {
    const result = generateInfraNoiseLog({
      dep: 'unknown_dep' as never,
      seed: SEED,
      service: K8S_SERVICE,
      timestamp: TIMESTAMP,
    });
    expect(result).toBeNull();
  });

  it('does not emit error level when not degraded', () => {
    // HEALTH_PROBS.normal has warn=0.05 — depending on the seed this may be 'info' or 'warn'.
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: K8S_SERVICE,
      timestamp: TIMESTAMP,
    });
    expect(doc).not.toBeNull();
    expect(doc!['log.level']).not.toBe('error');
  });

  it('emits non-info level when degraded=true (warn or error per HEALTH_PROBS.failing)', () => {
    const levels = [0, 1, 2, 3, 4].map((seed) => {
      const doc = generateInfraNoiseLog({
        dep: 'postgres',
        seed,
        degraded: true,
        service: K8S_SERVICE,
        timestamp: TIMESTAMP,
      });
      expect(doc).not.toBeNull();
      return doc!['log.level'];
    });
    expect(levels.every((l) => l === 'warn' || l === 'error')).toBe(true);
  });
});

describe('generateInfraNoiseLog — with service (metadata populated)', () => {
  it('populates service.name from the service node', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: K8S_SERVICE,
      timestamp: TIMESTAMP,
    });
    expect(doc!['service.name']).toBe(K8S_SERVICE.name);
  });

  it('populates host.name and host.os.type for a service without k8s', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: HOST_SERVICE,
      timestamp: TIMESTAMP,
    });
    const raw = doc as Record<string, unknown>;
    expect(doc!['host.name']).toBeDefined();
    expect(doc!['host.name']).not.toBeNull();
    expect(raw['host.os.type']).toBeDefined();
    expect(raw['host.os.type']).not.toBeNull();
  });

  it('populates k8s fields for a service with k8s deployment', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: K8S_SERVICE,
      timestamp: TIMESTAMP,
    });
    const raw = doc as Record<string, unknown>;
    expect(raw['kubernetes.pod.name']).toBeDefined();
    expect(raw['kubernetes.pod.name']).not.toBeNull();
    expect(raw['kubernetes.namespace']).toBe('test-ns');
    expect(raw['kubernetes.node.name']).toBeDefined();
  });

  it('does NOT populate kubernetes fields for a service without k8s deployment', () => {
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: HOST_SERVICE,
      timestamp: TIMESTAMP,
    });
    const raw = doc as Record<string, unknown>;
    expect(raw['kubernetes.pod.name']).toBeUndefined();
    expect(raw['kubernetes.namespace']).toBeUndefined();
  });

  it('uses cachedMetadata when provided instead of rebuilding', () => {
    const cachedMetadata = {
      'host.name': 'cached-host',
      'host.id': 'cached-id',
      'host.os.type': 'linux',
      'host.os.name': 'Ubuntu',
      'host.os.version': '22.04',
    };
    const doc = generateInfraNoiseLog({
      dep: 'postgres',
      seed: SEED,
      service: K8S_SERVICE,
      cachedMetadata,
      timestamp: TIMESTAMP,
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

    const docsWithServiceName = docs.filter((d) => d['service.name'] != null);
    expect(docsWithServiceName.length).toBeGreaterThan(0);

    const docsWithHostName = docs.filter((d) => d['host.name'] != null);
    expect(docsWithHostName.length).toBeGreaterThan(0);

    // null (vs undefined) means a bug — the unknown-dep fallback returns null from generateInfraNoiseLog
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
