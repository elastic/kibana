/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ActionsApiRequestHandlerContext,
  PluginSetupContract as ActionsPluginSetupContract,
  PluginStartContract as ActionsPluginStartContract,
} from '@kbn/actions-plugin/server';
import type {
  AlertingApiRequestHandlerContext,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ServerlessServerSetup } from '@kbn/serverless/server/types';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsManagementApi } from './workflows_management/workflows_management_api';

export interface WorkflowsServerPluginSetup {
  management: WorkflowsManagementApi;
  /**
   * Register the Agent Builder plugin with Workflows Management.
   * This is called by the agentBuilder plugin during its setup phase to allow
   * workflowsManagement to register agents, tools, and attachments without
   * creating a circular dependency.
   */
  registerAgentBuilder: (agentBuilder: AgentBuilderPluginSetupContract) => void;
}

export type WorkflowsServerPluginStart = Record<string, never>;

/**
 * AgentBuilder plugin setup contract interface.
 * Defined here to avoid circular dependency with @kbn/agent-builder-plugin.
 */
export interface AgentBuilderPluginSetupContract {
  agents: {
    register: (definition: {
      id: string;
      name: string;
      description: string;
      avatar_icon?: string;
      configuration: {
        instructions?: string;
        tools?: Array<{ tool_ids: string[] }>;
      };
    }) => void;
  };
  tools: {
    register: (definition: {
      id: string;
      type: string;
      description: string;
      tags?: string[];
      schema: unknown;
      handler: (
        params: unknown,
        context: unknown
      ) => Promise<{ results: Array<{ type: string; data: unknown }> }>;
    }) => void;
  };
  attachments: {
    registerType: (definition: {
      id: string;
      type: string;
      validate: (input: unknown) => { valid: boolean; data?: unknown; error?: string };
      format: (data: unknown) => { type: string; value: string };
    }) => void;
  };
}

export interface WorkflowsServerPluginSetupDeps {
  features?: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  actions?: ActionsPluginSetupContract;
  alerting?: AlertingServerSetup;
  spaces?: SpacesPluginStart;
  serverless?: ServerlessServerSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginSetupContract;
}

export interface WorkflowsServerPluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export type WorkflowsRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type WorkflowsRouter = IRouter<WorkflowsRequestHandlerContext>;
