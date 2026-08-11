/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceGraph } from '../types';
import { generateServiceDocs } from './service_logs';

const SEED = 42;
const BASE_TS = Date.parse('2023-11-15T00:00:00.000Z');

const GRAPH: ServiceGraph = {
  services: [
    {
      name: 'caller',
      runtime: 'node',
      version: '1.0.0',
      infraDeps: ['postgres'],
      deployment: { k8s: { namespace: 'test' } },
    },
    {
      name: 'callee',
      runtime: 'go',
      version: '1.0.0',
      infraDeps: ['redis'],
      deployment: { k8s: { namespace: 'test' } },
    },
  ],
  edges: [{ source: 'caller', target: 'callee', protocol: 'http' }],
};

describe('simulateRequest — outbound log level', () => {
  it('outbound log is error when downstream call fails (rate: 1)', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'caller',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
      failures: { services: { callee: { errorType: 'db_timeout', rate: 1 } } },
    });

    const outboundDoc = docs.find((d) => {
      const msg = String(d.message ?? '');
      return d['service.name'] === 'caller' && msg.includes('callee');
    });

    expect(outboundDoc).toBeDefined();
    expect(outboundDoc?.['log.level']).toBe('error');
  });

  it('outbound log is info when downstream call succeeds', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'caller',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const outboundDoc = docs.find((d) => {
      const msg = String(d.message ?? '');
      return msg.includes('callee');
    });

    expect(outboundDoc).toBeDefined();
    expect(outboundDoc?.['log.level']).toBe('info');
  });

  it('service self-log is error when a failure is active', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'callee',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
      failures: { services: { callee: { errorType: 'db_timeout', rate: 1 } } },
    });

    const selfDoc = docs.find((d) => d['service.name'] === 'callee');
    expect(selfDoc?.['log.level']).toBe('error');
  });

  it('service self-log is info when no failure is active', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'callee',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const selfDoc = docs.find((d) => d['service.name'] === 'callee');
    expect(selfDoc?.['log.level']).toBe('info');
  });
});

describe('simulateRequest — JSON validity of outbound messages', () => {
  it('node runtime outbound failure message is valid JSON (status is a numeric HTTP code)', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'caller',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
      failures: { services: { callee: { errorType: 'db_timeout', rate: 1 } } },
    });

    // node runtime uses JSON-format templates; the error template includes {target_svc}.
    const jsonOutboundDoc = docs.find((d) => {
      const msg = String(d.message ?? '');
      return d['service.name'] === 'caller' && msg.startsWith('{') && msg.includes('callee');
    });

    expect(jsonOutboundDoc).toBeDefined();
    expect(() => JSON.parse(String(jsonOutboundDoc!.message))).not.toThrow();
  });

  it('node runtime outbound success message is valid JSON', () => {
    const docs = generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'caller',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const jsonDoc = docs.find((d) => {
      const msg = String(d.message ?? '');
      return msg.startsWith('{') && msg.includes('callee');
    });

    expect(jsonDoc).toBeDefined();
    expect(() => JSON.parse(String(jsonDoc!.message))).not.toThrow();
  });
});

describe('simulateRequest — stability contract', () => {
  const getDocs = (index: number, seed = SEED) =>
    generateServiceDocs({
      serviceGraph: GRAPH,
      entryService: 'caller',
      seed,
      index,
      timestamp: BASE_TS,
    });

  const getCallerDoc = (index: number, seed = SEED) => {
    const doc = getDocs(index, seed).find(
      (d) => d['service.name'] === 'caller' && !String(d.message ?? '').includes('callee')
    );
    return doc as Record<string, unknown> | undefined;
  };

  const getOutboundDoc = (index: number, seed = SEED) => {
    const docs = getDocs(index, seed);
    const doc = docs.find((d) => {
      const msg = String(d.message ?? '');
      return msg.startsWith('{') && msg.includes('callee');
    });
    return doc ? JSON.parse(String(doc.message)) : undefined;
  };

  it('host.id, kubernetes.pod.uid and kubernetes.pod.name are identical across tick indexes', () => {
    const doc0 = getCallerDoc(0);
    const doc1 = getCallerDoc(1);
    const doc50 = getCallerDoc(50);

    for (const field of ['host.id', 'kubernetes.pod.uid', 'kubernetes.pod.name'] as const) {
      expect(doc0?.[field]).toBeDefined();
      expect(doc1?.[field]).toBe(doc0?.[field]);
      expect(doc50?.[field]).toBe(doc0?.[field]);
    }
  });

  it('identity fields differ between services and between seeds', () => {
    const docs = getDocs(0) as Array<Record<string, unknown>>;
    expect(docs.find((d) => d['service.name'] === 'caller')?.['host.id']).not.toBe(
      docs.find((d) => d['service.name'] === 'callee')?.['host.id']
    );
    expect(getCallerDoc(0, 42)?.['host.id']).not.toBe(getCallerDoc(0, 99)?.['host.id']);
  });

  it('reqId in outbound message varies across tick indexes', () => {
    const ids = [0, 1, 2].map((i) => getOutboundDoc(i)?.reqId);
    expect(ids.every((id) => id != null)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('simulateRequest — diamond graph (shared downstream visited via both paths)', () => {
  // entry → left  → shared
  //       ↘ right → shared
  const DIAMOND: ServiceGraph = {
    services: [
      { name: 'entry', runtime: 'node', version: '1.0.0', infraDeps: [] },
      { name: 'left', runtime: 'go', version: '1.0.0', infraDeps: [] },
      { name: 'right', runtime: 'java', version: '1.0.0', infraDeps: [] },
      { name: 'shared', runtime: 'python', version: '1.0.0', infraDeps: [] },
    ],
    edges: [
      { source: 'entry', target: 'left', protocol: 'http' },
      { source: 'entry', target: 'right', protocol: 'http' },
      { source: 'left', target: 'shared', protocol: 'http' },
      { source: 'right', target: 'shared', protocol: 'http' },
    ],
  };

  it('generates docs for the shared service from both paths (not just one)', () => {
    const docs = generateServiceDocs({
      serviceGraph: DIAMOND,
      entryService: 'entry',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const sharedDocs = docs.filter((d) => d['service.name'] === 'shared');
    // Each path (left→shared, right→shared) produces at least one self-log for 'shared'.
    // A global visited set would produce only 1 doc; the path-based guard produces ≥ 2.
    expect(sharedDocs.length).toBeGreaterThanOrEqual(2);
  });

  it('emits an outbound log from both left and right toward shared', () => {
    const docs = generateServiceDocs({
      serviceGraph: DIAMOND,
      entryService: 'entry',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const leftOutbound = docs.find(
      (d) => d['service.name'] === 'left' && String(d.message ?? '').includes('shared')
    );
    const rightOutbound = docs.find(
      (d) => d['service.name'] === 'right' && String(d.message ?? '').includes('shared')
    );

    expect(leftOutbound).toBeDefined();
    expect(rightOutbound).toBeDefined();
  });

  it('propagates shared service failures via both left and right legs', () => {
    const docs = generateServiceDocs({
      serviceGraph: DIAMOND,
      entryService: 'entry',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
      failures: { services: { shared: { errorType: 'db_timeout', rate: 1 } } },
    });

    const sharedDocs = docs.filter((d) => d['service.name'] === 'shared');
    expect(sharedDocs.length).toBeGreaterThanOrEqual(2);
    expect(sharedDocs.every((d) => d['log.level'] === 'error')).toBe(true);

    // Both intermediate services should record an outbound error toward shared.
    const leftErr = docs.find((d) => d['service.name'] === 'left' && d['log.level'] === 'error');
    const rightErr = docs.find((d) => d['service.name'] === 'right' && d['log.level'] === 'error');
    expect(leftErr).toBeDefined();
    expect(rightErr).toBeDefined();
  });
});

describe('simulateRequest — cycle detection', () => {
  // svc-a → svc-b → svc-a (cycle)
  const CYCLIC: ServiceGraph = {
    services: [
      { name: 'svc-a', runtime: 'node', version: '1.0.0', infraDeps: [] },
      { name: 'svc-b', runtime: 'go', version: '1.0.0', infraDeps: [] },
    ],
    edges: [
      { source: 'svc-a', target: 'svc-b', protocol: 'http' },
      { source: 'svc-b', target: 'svc-a', protocol: 'http' },
    ],
  };

  it('does not infinitely recurse on a cyclic graph', () => {
    expect(() =>
      generateServiceDocs({
        serviceGraph: CYCLIC,
        entryService: 'svc-a',
        seed: SEED,
        index: 0,
        timestamp: BASE_TS,
      })
    ).not.toThrow();
  });

  it('generates docs for both services despite the cycle', () => {
    const docs = generateServiceDocs({
      serviceGraph: CYCLIC,
      entryService: 'svc-a',
      seed: SEED,
      index: 0,
      timestamp: BASE_TS,
    });

    const names = new Set(docs.map((d) => d['service.name']));
    expect(names).toContain('svc-a');
    expect(names).toContain('svc-b');
  });
});

describe('simulateRequest — warn emission', () => {
  it('emits warn-level doc on non-error tick when failure is configured', () => {
    // emitWarn fires on ~21% of non-error ticks with rate:0.7 — scan 200 indices to hit one.
    let foundWarnDoc: Record<string, unknown> | undefined;
    for (let i = 0; i < 200 && !foundWarnDoc; i++) {
      const docs = generateServiceDocs({
        serviceGraph: GRAPH,
        entryService: 'callee',
        seed: SEED,
        index: i,
        timestamp: BASE_TS + i * 1000,
        failures: { services: { callee: { errorType: 'db_timeout', rate: 0.7 } } },
      });
      foundWarnDoc = (docs as Array<Record<string, unknown>>).find(
        (d) => d['service.name'] === 'callee' && d['log.level'] === 'warn'
      );
    }
    expect(foundWarnDoc).toBeDefined();
    expect(String(foundWarnDoc?.message).toLowerCase()).toMatch(/warn/);
  });
});
