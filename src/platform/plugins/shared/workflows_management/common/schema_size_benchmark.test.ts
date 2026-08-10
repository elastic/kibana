/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElasticsearchConnectors, getKibanaConnectors } from '@kbn/workflows';
import { getAllConnectors, getWorkflowZodSchema } from './schema';

/*
 * These benchmarks guard against connector-count / schema-size regressions
 * that previously caused OOM in memory-constrained Kibana pods (≤ 1 GB).
 * See: https://github.com/elastic/security-team/issues/15743
 *
 * Unlike the old heap-based test (internal_actions_memory.test.ts) which was
 * permanently skipped due to flakiness, these thresholds are deterministic:
 * connector counts and serialised sizes don't depend on GC behaviour.
 *
 * If a threshold is exceeded, it likely means new actions were whitelisted.
 * Before raising a threshold, verify the schema still fits in a 1 GB Kibana pod
 * by running the Scout OOM prevention test:
 *   node scripts/scout run-tests --arch stateful --domain classic \
 *     --config src/platform/plugins/shared/workflows_management/test/scout_workflows_oom_testing/api/playwright.config.ts
 */

describe('workflow schema size benchmarks', () => {
  describe('connector counts', () => {
    it('elasticsearch connectors stay within budget', () => {
      const connectors = getElasticsearchConnectors();
      expect(connectors.length).toBeGreaterThan(5);
      expect(connectors.length).toBeLessThanOrEqual(100);
    });

    it('kibana connectors stay within budget', () => {
      const connectors = getKibanaConnectors();
      expect(connectors.length).toBeGreaterThan(5);
      expect(connectors.length).toBeLessThanOrEqual(100);
    });

    it('total internal connectors stay within budget', () => {
      const connectors = getAllConnectors();
      expect(connectors.length).toBeGreaterThan(10);
      expect(connectors.length).toBeLessThanOrEqual(250);
    });
  });

  describe('serialised sizes', () => {
    const measureJsonSizeMB = (value: unknown): number => {
      const json = JSON.stringify(value);
      return Buffer.byteLength(json, 'utf8') / (1024 * 1024);
    };

    // Baseline: ~20 MB (ES spec definitions are large by nature)
    it('elasticsearch connectors serialised size stays under 25 MB', () => {
      const connectors = getElasticsearchConnectors();
      const sizeMB = measureJsonSizeMB(connectors);
      expect(sizeMB).toBeLessThan(25);
    });

    // Baseline: ~0.7 MB
    it('kibana connectors serialised size stays under 2 MB', () => {
      const connectors = getKibanaConnectors();
      const sizeMB = measureJsonSizeMB(connectors);
      expect(sizeMB).toBeLessThan(2);
    });

    // Baseline: ~21 MB
    it('total internal connectors serialised size stays under 30 MB', () => {
      const connectors = getAllConnectors();
      const sizeMB = measureJsonSizeMB(connectors);
      expect(sizeMB).toBeLessThan(30);
    });
  });

  describe('schema materialisation', () => {
    it('schema materialises without error', () => {
      const schema = getWorkflowZodSchema({});
      expect(schema).toBeDefined();
    });

    it('schema materialisation completes within 30 seconds', () => {
      const start = performance.now();
      getWorkflowZodSchema({});
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(30_000);
    });
  });
});
