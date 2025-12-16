/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules */

import { readFileSync } from 'fs';
import Path from 'path';
import v8 from 'v8';
import { getElasticsearchConnectors, getKibanaConnectors } from '@kbn/workflows';
import { parseWorkflowYamlToJSON } from './lib/yaml';
import { getWorkflowZodSchema } from './schema';

const threesholdInPersents = 1.2; // +20% to allow for minor runtime variance

/**
 * Skipping this test as it's flaky.
 * TODO: Revisit it later
 */
describe.skip('internal connectors memory tests', () => {
  const forceGC = () => {
    if (global.gc) {
      global.gc();
    }
  };

  const getHeapMB = () => v8.getHeapStatistics().used_heap_size / 1024 / 1024;

  const workflowYaml = readFileSync(
    Path.join(__dirname, 'examples', 'national_parks.yaml'),
    'utf8'
  );

  describe('getElasticsearchConnectors memory usage', () => {
    it('should have reasonable memory usage', () => {
      const retainer = [];
      const before = getHeapMB();
      retainer.push(getElasticsearchConnectors());
      forceGC();
      const after = getHeapMB();
      expect(after - before).toBeLessThan(40 * threesholdInPersents); // Current baseline ~40 MB; threshold allows for minor runtime variance
      expect(retainer.length).toBe(1);
    });
  });

  describe('getKibanaConnectors memory usage', () => {
    it('should have reasonable memory usage', () => {
      const retainer = [];
      const before = getHeapMB();
      retainer.push(getKibanaConnectors());
      forceGC();
      const after = getHeapMB();
      expect(after - before).toBeLessThan(7 * threesholdInPersents); // Current baseline ~7 MB; threshold allows for minor runtime variance
      expect(retainer.length).toBe(1);
    });
  });

  describe('getWorkflowZodSchema memory usage', () => {
    it('should have reasonable memory usage', () => {
      const retainer = [];
      const before = getHeapMB();
      retainer.push(getWorkflowZodSchema({}));
      forceGC();
      const after = getHeapMB();
      expect(after - before).toBeLessThan(10 * threesholdInPersents); // Current baseline ~10 MB; threshold allows for minor runtime variance
      expect(retainer.length).toBe(1);
    });
  });

  describe('parseWorkflowYamlToJSON memory usage', () => {
    it('should have reasonable memory usage', () => {
      const retainer = [];
      const before = getHeapMB();
      const schema = getWorkflowZodSchema({});
      retainer.push(schema);
      retainer.push(parseWorkflowYamlToJSON(workflowYaml, schema));
      forceGC();
      const after = getHeapMB();
      expect(after - before).toBeLessThan(70 * threesholdInPersents); // Current baseline ~70 MB; threshold allows for minor runtime variance
      expect(retainer.length).toBe(2);
    });
  });
});
