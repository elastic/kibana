/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import { reconstructTrace } from './reconstruct';
import type { CapturedSource } from './reconstruct';
import { generateScenario } from './codegen';

const baseStart = Date.parse('2024-01-01T00:00:00.000Z');

const at = (offsetMs: number): string => new Date(baseStart + offsetMs).toISOString();

const makeTrace = (): CapturedSource[] => [
  {
    '@timestamp': at(0),
    processor: { event: 'transaction' },
    trace: { id: 'trace-1' },
    transaction: { id: 'tx-root', name: 'GET /api', type: 'request', duration: { us: 120000 } },
    service: { name: 'frontend', environment: 'prod', node: { name: 'fe-1' } },
    agent: { name: 'rum-js' },
    event: { outcome: 'success' },
    http: { response: { status_code: 200 } },
    url: { full: 'https://shop.example.com/api' },
  },
  {
    '@timestamp': at(5),
    processor: { event: 'span' },
    trace: { id: 'trace-1' },
    span: {
      id: 'span-http',
      name: 'GET backend',
      type: 'external',
      subtype: 'http',
      duration: { us: 90000 },
      destination: { service: { resource: 'backend:3000' } },
    },
    parent: { id: 'tx-root' },
    transaction: { id: 'tx-root' },
    service: { name: 'frontend', environment: 'prod', node: { name: 'fe-1' } },
    agent: { name: 'rum-js' },
    event: { outcome: 'success' },
  },
  {
    '@timestamp': at(10),
    processor: { event: 'transaction' },
    trace: { id: 'trace-1' },
    transaction: {
      id: 'tx-backend',
      name: 'GET /resource',
      type: 'request',
      duration: { us: 70000 },
    },
    parent: { id: 'span-http' },
    service: { name: 'backend', environment: 'prod', node: { name: 'be-1' } },
    agent: { name: 'go' },
    event: { outcome: 'failure' },
  },
  {
    '@timestamp': at(12),
    processor: { event: 'error' },
    trace: { id: 'trace-1' },
    error: {
      id: 'err-1',
      exception: [{ message: 'boom', type: 'RuntimeError' }],
      culprit: 'handler',
    },
    parent: { id: 'tx-backend' },
    transaction: { id: 'tx-backend' },
    service: { name: 'backend', environment: 'prod', node: { name: 'be-1' } },
    agent: { name: 'go' },
  },
];

describe('capture_trace_scenario', () => {
  describe('reconstructTrace', () => {
    it('builds a parent/child tree across services with rebased offsets', () => {
      const trace = reconstructTrace(makeTrace());

      expect(trace.traceId).toBe('trace-1');
      expect(trace.services).toHaveLength(2);
      expect(trace.roots).toHaveLength(1);

      const [root] = trace.roots;
      expect(root.id).toBe('tx-root');
      expect(root.offsetMs).toBe(0);
      expect(root.durationMs).toBe(120);
      expect(root.outcome).toBe('success');
      expect(root.overrides).toEqual({
        'http.response.status_code': 200,
        'url.full': 'https://shop.example.com/api',
      });

      const [span] = root.children;
      expect(span.kind).toBe('span');
      expect(span.offsetMs).toBe(5);
      expect(span.overrides['span.destination.service.resource']).toBe('backend:3000');

      const [backendTx] = span.children;
      expect(backendTx.id).toBe('tx-backend');
      expect(backendTx.outcome).toBe('failure');
      expect(backendTx.errors).toHaveLength(1);
      expect(backendTx.errors[0].message).toBe('boom');
    });

    it('anonymizes identifiers and drops sensitive fields when scrubbing', () => {
      const trace = reconstructTrace(makeTrace(), { scrub: true });

      const names = trace.services.map((svc) => svc.name).sort();
      expect(names).toEqual(['service-1', 'service-2']);
      // All sample docs share the 'prod' environment, so it maps to a single fake.
      expect(trace.services.every((svc) => svc.environment === 'environment-1')).toBe(true);

      const [root] = trace.roots;
      // Identifying strings are anonymized, numeric values preserved.
      expect(root.name).toBe('transaction-1');
      expect(root.overrides['url.full']).toBeUndefined();
      expect(root.overrides['http.response.status_code']).toBe(200);

      const [span] = root.children;
      expect(span.overrides['span.destination.service.resource']).toBe('dependency-1');
    });

    it('captures every non-managed field verbatim (collect-all) and excludes builder-managed fields', () => {
      const docs: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'trace-1' },
          transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
          service: { name: 'frontend', environment: 'prod', node: { name: 'fe-1' }, version: '1.2.3' },
          agent: { name: 'go', version: '2.0.0' },
          host: { name: 'host-a', architecture: 'arm64' },
          event: { outcome: 'success' },
          container: { id: 'c-1' },
          cloud: { region: 'us-east-1' },
          labels: { tier: 'gold' },
          http: { request: { method: 'GET' }, response: { status_code: 201 } },
        },
      ];

      const [root] = reconstructTrace(docs).roots;

      // Arbitrary fields that were never on a hardcoded allowlist are now preserved.
      expect(root.overrides).toMatchObject({
        'service.version': '1.2.3',
        'agent.version': '2.0.0',
        'host.architecture': 'arm64',
        'container.id': 'c-1',
        'cloud.region': 'us-east-1',
        'labels.tier': 'gold',
        'http.request.method': 'GET',
        'http.response.status_code': 201,
      });

      // Fields the synthtrace builders/serializer set themselves must NOT be echoed back.
      for (const managed of [
        '@timestamp',
        'trace.id',
        'transaction.id',
        'transaction.name',
        'transaction.type',
        'transaction.duration.us',
        'service.name',
        'service.environment',
        'service.node.name',
        'agent.name',
        'host.name',
        'processor.event',
        'event.outcome',
      ]) {
        expect(root.overrides[managed]).toBeUndefined();
      }
    });

    it('drops or anonymizes sensitive fields under collect-all when scrubbing', () => {
      const docs: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'trace-1' },
          transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
          service: { name: 'frontend', environment: 'prod', node: { name: 'fe-1' } },
          agent: { name: 'go' },
          event: { outcome: 'success' },
          url: { full: 'https://shop.example.com/checkout?token=secret' },
          http: {
            request: { method: 'GET', headers: { authorization: 'Bearer abc' }, body: { original: 'pii' } },
          },
          client: { ip: '10.0.0.1' },
          source: { ip: '10.0.0.2' },
          host: { ip: '10.0.0.3' },
          user: { email: 'alice@example.com' },
          message: 'free-form log line with secrets',
          labels: { customer: 'acme-corp' },
          server: { address: 'db.internal.example.com' },
        },
        {
          '@timestamp': at(5),
          processor: { event: 'span' },
          trace: { id: 'trace-1' },
          span: {
            id: 'span-1',
            name: 'SELECT',
            type: 'db',
            subtype: 'postgresql',
            duration: { us: 500 },
            db: { statement: 'SELECT * FROM users WHERE ssn = 123' },
            destination: { service: { resource: 'postgresql:5432' } },
          },
          parent: { id: 'tx-1' },
          transaction: { id: 'tx-1' },
          service: { name: 'frontend', environment: 'prod', node: { name: 'fe-1' } },
          agent: { name: 'go' },
          event: { outcome: 'success' },
        },
      ];

      const trace = reconstructTrace(docs, { scrub: true });
      const [root] = trace.roots;

      // High-leak fields are dropped entirely.
      for (const dropped of [
        'url.full',
        'http.request.headers.authorization',
        'http.request.body.original',
        'client.ip',
        'source.ip',
        'host.ip',
        'user.email',
        'message',
      ]) {
        expect(root.overrides[dropped]).toBeUndefined();
      }

      // server.address / labels.* are kept but anonymized to a deterministic, non-identifying label.
      expect(root.overrides['server.address']).toBe('host-1');
      expect(root.overrides['labels.customer']).toBe('label-1');

      const [span] = root.children;
      expect(span.overrides['span.db.statement']).toBeUndefined();
      expect(span.overrides['span.destination.service.resource']).toBe('dependency-1');
    });

    it('captures all numeric metric fields, not a hardcoded subset', () => {
      const docs: CapturedSource[] = [
        ...makeTrace(),
        {
          '@timestamp': at(8),
          processor: { event: 'metric' },
          metricset: { name: 'app' },
          service: { name: 'backend', environment: 'prod', node: { name: 'be-1' } },
          agent: { name: 'go' },
          // A novel metric field that was never on the old APP_METRIC_FIELDS allowlist.
          custom: { runtime: { gauge: 7 } },
          system: { process: { cpu: { total: { norm: { pct: 0.5 } } } } },
        },
      ];

      const [sample] = reconstructTrace(docs).metrics;
      expect(sample.metrics).toEqual({
        'custom.runtime.gauge': 7,
        'system.process.cpu.total.norm.pct': 0.5,
      });
    });

    it('throws when there is no capturable data', () => {
      expect(() => reconstructTrace([{ processor: { event: 'metric' } }])).toThrow(
        /No transaction, span, error or application-metric documents/
      );
    });

    it('captures app/system/runtime metric samples', () => {
      const docs: CapturedSource[] = [
        ...makeTrace(),
        {
          '@timestamp': at(8),
          processor: { event: 'metric' },
          metricset: { name: 'app' },
          service: { name: 'backend', environment: 'prod', node: { name: 'be-1' } },
          agent: { name: 'go' },
          system: { cpu: { total: { norm: { pct: 0.42 } } }, memory: { total: 2048 } },
          jvm: { memory: { heap: { used: 512 } } },
        },
        // Aggregated transaction metrics must be ignored (synthtrace regenerates them).
        {
          '@timestamp': at(8),
          processor: { event: 'metric' },
          metricset: { name: 'transaction' },
          service: { name: 'backend', environment: 'prod', node: { name: 'be-1' } },
          transaction: { duration: { histogram: { counts: [1], values: [1000] } } },
        },
      ];

      const trace = reconstructTrace(docs);

      expect(trace.metrics).toHaveLength(1);
      const [sample] = trace.metrics;
      expect(sample.metrics).toEqual({
        'system.cpu.total.norm.pct': 0.42,
        'system.memory.total': 2048,
        'jvm.memory.heap.used': 512,
      });

      const code = generateScenario(trace, { description: 'with metrics' });
      expect(code).toContain('.appMetrics(metric.metrics)');
      // The numeric metric values are preserved verbatim in the captured data literal.
      expect(code).toContain("'system.cpu.total.norm.pct': 0.42");
    });

    it('preserves host.name separately from the instance name', () => {
      const docs: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'trace-host' },
          transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
          // service.node.name differs from host.name: the host must be preserved on its own.
          service: { name: 'frontend', environment: 'prod', node: { name: 'node-a' } },
          host: { name: 'host-a' },
          agent: { name: 'go' },
          event: { outcome: 'success' },
        },
      ];

      const trace = reconstructTrace(docs);
      expect(trace.services).toHaveLength(1);
      expect(trace.services[0].instance).toBe('node-a');
      expect(trace.services[0].hostName).toBe('host-a');
    });

    it('scrubs host.name via the shared host category', () => {
      const docs: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'trace-host' },
          transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
          service: { name: 'frontend', environment: 'prod', node: { name: 'node-a' } },
          host: { name: 'host-a' },
          agent: { name: 'go' },
          event: { outcome: 'success' },
        },
      ];

      const trace = reconstructTrace(docs, { scrub: true });
      expect(trace.services[0].hostName).toBe('host-1');
    });
  });

  describe('generateScenario', () => {
    it('emits a runnable scenario module', () => {
      const trace = reconstructTrace(makeTrace());
      const code = generateScenario(trace, {
        description: 'Captured trace-1',
        source: 'http://localhost:9200',
      });

      expect(code).toContain("import { apm } from '@kbn/synthtrace-client';");
      expect(code).toContain('const scenario: Scenario<ApmFields> = async ({ from }) => {');
      expect(code).toContain('export default scenario;');

      // Data-driven emission: the capture is a single `captured` literal + a fixed builder loop,
      // so there is no per-event `const` (which would hit the JS per-function locals ceiling).
      expect(code).toContain('const captured = {');
      // Nodes are rebuilt by a flat loop (not a recursive `buildNode`), so deep traces don't
      // overflow Babel's parser or the runtime stack on replay.
      expect(code).toContain('const builders = captured.nodes.map((node) => {');
      expect(code).not.toMatch(/const transaction1\b/);

      // The service (incl. its own captured environment) lives in the data literal.
      expect(code).toContain("name: 'frontend'");
      expect(code).toContain("environment: 'prod'");
      expect(code).toContain("agentName: 'rum-js'");
      // Each service bakes in its own captured environment instead of a single shared constant.
      expect(code).not.toContain('getSynthtraceEnvironment');
      expect(code).not.toContain('environment: ENVIRONMENT');
      // Transaction data is carried verbatim and rebuilt by the loop.
      expect(code).toContain("name: 'GET /api'");
      expect(code).toContain("transactionType: 'request'");
      expect(code).toContain('service.transaction({');
      // Timestamps are baked to an absolute epoch (not "now"), so round-trips are deterministic.
      expect(code).not.toContain('range.to.getTime()');
      expect(code).toMatch(/const start = \d+;/);
      expect(code).toContain('builder.timestamp(start + node.offset)');
      expect(code).toContain('.duration(node.duration)');
      expect(code).toContain('duration: 120');
      expect(code).toContain('builders[node.parent].children(builders[index]);');
      expect(code).toContain('builder.errors(buildError(error))');
      expect(code).toContain('function* generateCapturedEvents()');
      // The first-bucket guard makes multi-worker replays emit the dataset exactly once.
      expect(code).toContain('const isFirstWorkerBucket = range.from.getTime() === from;');
      expect(code).toContain('yield* rootEvents;');
      // A genuine multi-document capture must not be flagged as degenerate.
      expect(code).not.toContain('WARNING: the captured data spans');
    });

    it('emits .hostName(...) for services with a captured host name', () => {
      const docs: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'trace-host' },
          transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
          service: { name: 'frontend', environment: 'prod', node: { name: 'node-a' } },
          host: { name: 'host-a' },
          agent: { name: 'go' },
          event: { outcome: 'success' },
        },
      ];

      const code = generateScenario(reconstructTrace(docs), { description: 'with host' });
      expect(code).toContain("hostName: 'host-a'");
      expect(code).toContain('instance.hostName(service.hostName);');
    });

    it('warns when many documents collapse onto a sub-second span', () => {
      const collapsed: CapturedSource[] = Array.from({ length: 12 }, (_, i) => ({
        '@timestamp': at(0),
        processor: { event: 'transaction' },
        trace: { id: `trace-${i}` },
        transaction: { id: `tx-${i}`, name: `GET /r${i}`, type: 'request', duration: { us: 1000 } },
        service: { name: `svc-${i % 3}`, environment: 'prod', node: { name: 'n-1' } },
        agent: { name: 'go' },
        event: { outcome: 'success' },
      }));

      const code = generateScenario(reconstructTrace(collapsed), { description: 'collapsed' });
      expect(code).toContain('WARNING: the captured data spans only 0ms across 12 documents');
    });

    it('emits a deep trace as a flat node list that the parser can handle', () => {
      // A long parent -> child span chain. A nested object literal would overflow the
      // recursive-descent parser (and a recursive runtime builder) on replay; the flat
      // representation must parse without blowing the stack.
      const depth = 5000;
      const deep: CapturedSource[] = [
        {
          '@timestamp': at(0),
          processor: { event: 'transaction' },
          trace: { id: 'deep' },
          transaction: { id: 'span-0', name: 'root', type: 'request', duration: { us: 1000 } },
          service: { name: 'svc', environment: 'prod', node: { name: 'n-1' } },
          agent: { name: 'go' },
          event: { outcome: 'success' },
        },
        ...Array.from({ length: depth }, (_, i) => ({
          '@timestamp': at(i + 1),
          processor: { event: 'span' },
          trace: { id: 'deep' },
          span: {
            id: `span-${i + 1}`,
            name: `s${i + 1}`,
            type: 'app',
            subtype: 'internal',
            duration: { us: 500 },
          },
          service: { name: 'svc', environment: 'prod', node: { name: 'n-1' } },
          agent: { name: 'go' },
          event: { outcome: 'success' },
          parent: { id: `span-${i}` },
        })),
      ];

      const code = generateScenario(reconstructTrace(deep), { description: 'deep' });

      // The generated data literal must be flat (parent references), not a nested tree.
      expect(code).toContain('parent:');
      expect(code).not.toMatch(/children:\s*\[/);

      // The whole point: parsing the generated module must not overflow the stack.
      expect(() => parse(code, { sourceType: 'module', plugins: ['typescript'] })).not.toThrow();
    });
  });
});
