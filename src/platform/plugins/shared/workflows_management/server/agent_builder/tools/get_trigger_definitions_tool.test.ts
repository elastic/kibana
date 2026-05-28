/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { z } from '@kbn/zod/v4';
import { registerGetTriggerDefinitionsTool } from './get_trigger_definitions_tool';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';

type GetRegisteredTriggersApi = Pick<WorkflowsManagementApi, 'getRegisteredTriggers'>;

const invokeHandler = async (tool: BuiltinToolDefinition, input: unknown, context: unknown) =>
  (await tool.handler(input as never, context as never)) as ToolHandlerStandardReturn;

const mockCasesTrigger = {
  id: 'cases.caseUpdated',
  eventSchema: z.object({
    caseId: z.string(),
    owner: z.string(),
  }),
};

describe('registerGetTriggerDefinitionsTool', () => {
  let registeredTool: BuiltinToolDefinition;
  let mockApi: jest.Mocked<GetRegisteredTriggersApi>;

  beforeEach(() => {
    mockApi = {
      getRegisteredTriggers: jest.fn().mockResolvedValue([mockCasesTrigger]),
    };

    const agentBuilder = {
      tools: {
        register: jest.fn((tool: BuiltinToolDefinition) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetTriggerDefinitionsTool(agentBuilder, mockApi);
  });

  it('registers with correct id', () => {
    expect(registeredTool.id).toBe('platform.workflows.get_trigger_definitions');
  });

  it('wraps lookup result in agent builder tool response shape', async () => {
    const result = await invokeHandler(registeredTool, { triggerType: 'manual' }, {});

    expect(mockApi.getRegisteredTriggers).toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0].data).toEqual({
      count: 1,
      triggerTypes: [expect.objectContaining({ id: 'manual' })],
    });
  });
});
