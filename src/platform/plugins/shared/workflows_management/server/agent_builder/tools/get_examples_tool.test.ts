/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StaticToolRegistration } from '@kbn/agent-builder-common';
import { WORKFLOW_EXAMPLES } from '@kbn/workflows';
import type { ZodObject, ZodRawShape } from '@kbn/zod';
import { registerGetExamplesTool } from './get_examples_tool';

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'name: Test Workflow\nenabled: true'),
}));

describe('registerGetExamplesTool', () => {
  let registeredTool: StaticToolRegistration<ZodObject<ZodRawShape>>;

  beforeEach(() => {
    jest.clearAllMocks();
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: StaticToolRegistration<ZodObject<ZodRawShape>>) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetExamplesTool(agentBuilder);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_examples');
  });

  it('returns examples without filter', async () => {
    const result = await registeredTool.handler({} as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    expect(data.count).toBeLessThanOrEqual(3);
    expect(data.totalAvailable).toBe(WORKFLOW_EXAMPLES.length);
  });

  it('respects default limit of 3', async () => {
    const result = await registeredTool.handler({} as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.count).toBeLessThanOrEqual(3);
  });

  it('respects custom limit capped at 5', async () => {
    const result = await registeredTool.handler({ limit: 10 } as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.count).toBeLessThanOrEqual(5);
  });

  it('filters by category', async () => {
    const result = await registeredTool.handler({ category: 'security' } as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
    const securityExamples = WORKFLOW_EXAMPLES.filter((e) => e.category === 'security');
    expect(data.totalAvailable).toBe(securityExamples.length);
  });

  it('filters by search term', async () => {
    const result = await registeredTool.handler({ search: 'alert' } as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.count).toBeGreaterThan(0);
  });

  it('includes YAML content in results', async () => {
    const result = await registeredTool.handler({} as any, {} as any);
    const data = result.results[0].data as any;
    expect(data.examples[0]).toHaveProperty('yaml');
    expect(data.examples[0].yaml).toContain('Test Workflow');
  });

  it('returns results in expected shape', async () => {
    const result = await registeredTool.handler({} as any, {} as any);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    const data = result.results[0].data as any;
    for (const example of data.examples) {
      expect(example).toHaveProperty('id');
      expect(example).toHaveProperty('name');
      expect(example).toHaveProperty('category');
    }
  });
});
