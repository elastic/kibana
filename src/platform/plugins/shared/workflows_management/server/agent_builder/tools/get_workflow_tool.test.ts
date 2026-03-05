/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StaticToolRegistration } from '@kbn/agent-builder-common';
import type { ZodObject, ZodRawShape } from '@kbn/zod';
import { registerGetWorkflowTool } from './get_workflow_tool';

const mockWorkflow = {
  id: 'wf-1',
  name: 'Alert Triage',
  description: 'Automated alert triage',
  enabled: true,
  createdAt: '2025-01-01',
  createdBy: 'user',
  lastUpdatedAt: '2025-01-01',
  lastUpdatedBy: 'user',
  definition: null,
  yaml: 'name: Alert Triage\nenabled: true\ntriggers:\n  - type: manual\nsteps: []',
  valid: true,
};

describe('registerGetWorkflowTool', () => {
  let registeredTool: StaticToolRegistration<ZodObject<ZodRawShape>>;
  const mockApi = {
    getWorkflow: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: StaticToolRegistration<ZodObject<ZodRawShape>>) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetWorkflowTool(agentBuilder, mockApi);
  });

  const context = { spaceId: 'default' } as any;

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_workflow');
  });

  it('returns workflow details with YAML', async () => {
    mockApi.getWorkflow.mockResolvedValue(mockWorkflow);
    const result = await registeredTool.handler({ workflowId: 'wf-1' } as any, context);
    const data = result.results[0].data as any;
    expect(data.id).toBe('wf-1');
    expect(data.name).toBe('Alert Triage');
    expect(data.yaml).toContain('Alert Triage');
    expect(data.enabled).toBe(true);
  });

  it('returns error for non-existent workflow', async () => {
    mockApi.getWorkflow.mockResolvedValue(null);
    const result = await registeredTool.handler({ workflowId: 'missing' } as any, context);
    const data = result.results[0].data as any;
    expect(data.error).toContain('not found');
  });

  it('returns results in expected shape', async () => {
    mockApi.getWorkflow.mockResolvedValue(mockWorkflow);
    const result = await registeredTool.handler({ workflowId: 'wf-1' } as any, context);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
  });
});
