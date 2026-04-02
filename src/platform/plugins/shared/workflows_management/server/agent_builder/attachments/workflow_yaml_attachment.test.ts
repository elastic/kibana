/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerWorkflowYamlAttachment } from './workflow_yaml_attachment';
import { workflowTools } from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

describe('workflow_yaml_attachment', () => {
  describe('getTools', () => {
    it('includes all workflow tools', () => {
      let registeredType: { getTools?: () => string[] } | undefined;
      const mockAgentBuilder = {
        attachments: {
          registerType: jest.fn((type: unknown) => {
            registeredType = type as typeof registeredType;
          }),
        },
      } as unknown as AgentBuilderPluginSetupContract;
      const mockApi = {} as unknown as WorkflowsManagementApi;

      registerWorkflowYamlAttachment(mockAgentBuilder, mockApi);

      const tools = registeredType!.getTools!();
      expect(tools).toEqual(Object.values(workflowTools));
    });

    it('does not include list_workflows or get_workflow tool IDs', () => {
      let registeredType: { getTools?: () => string[] } | undefined;
      const mockAgentBuilder = {
        attachments: {
          registerType: jest.fn((type: unknown) => {
            registeredType = type as typeof registeredType;
          }),
        },
      } as unknown as AgentBuilderPluginSetupContract;
      const mockApi = {} as unknown as WorkflowsManagementApi;

      registerWorkflowYamlAttachment(mockAgentBuilder, mockApi);

      const tools = registeredType!.getTools!();
      expect(tools).not.toContain('internal.workflows.list_workflows');
      expect(tools).not.toContain('internal.workflows.get_workflow');
    });

    it('includes key workflow tools', () => {
      let registeredType: { getTools?: () => string[] } | undefined;
      const mockAgentBuilder = {
        attachments: {
          registerType: jest.fn((type: unknown) => {
            registeredType = type as typeof registeredType;
          }),
        },
      } as unknown as AgentBuilderPluginSetupContract;
      const mockApi = {} as unknown as WorkflowsManagementApi;

      registerWorkflowYamlAttachment(mockAgentBuilder, mockApi);

      const tools = registeredType!.getTools!();
      expect(tools).toContain(workflowTools.getStepDefinitions);
      expect(tools).toContain(workflowTools.validateWorkflow);
      expect(tools).toContain(workflowTools.replaceYaml);
      expect(tools).toContain(workflowTools.insertStep);
      expect(tools).toContain(workflowTools.modifyStep);
    });
  });
});
