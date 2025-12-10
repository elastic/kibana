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

const forceGC = () => {
  if (global.gc) {
    global.gc();
  }
};

const getHeapMB = () => v8.getHeapStatistics().used_heap_size / 1024 / 1024;

const workflowYaml = readFileSync(Path.join(__dirname, 'examples', 'national_parks.yaml'), 'utf8');

describe('getElasticsearchConnectors memory usage', () => {
  it('should be less than 10 MB', () => {
    const before = getHeapMB();
    const connectors = getElasticsearchConnectors();
    forceGC();
    const after = getHeapMB();
    expect(after - before).toBeLessThan(1);
  });
});

describe('getKibanaConnectors memory usage', () => {
  it('should be less than 10 MB', () => {
    const before = getHeapMB();
    const connectors = getKibanaConnectors();
    forceGC();
    const after = getHeapMB();
    expect(after - before).toBeLessThan(1);
  });
});

describe('getWorkflowZodSchema memory usage', () => {
  it('should be less than 10 MB', () => {
    const before = getHeapMB();
    const schema = getWorkflowZodSchema({});
    forceGC();
    const after = getHeapMB();
    expect(after - before).toBeLessThan(10);
  });
});

describe('parseWorkflowYamlToJSON memory usage', () => {
  it('should be less than 10 MB', () => {
    const before = getHeapMB();
    const schema = getWorkflowZodSchema({});
    const result = parseWorkflowYamlToJSON(workflowYaml, schema);
    forceGC();
    const after = getHeapMB();
    expect(after - before).toBeLessThan(70);
  });
});
