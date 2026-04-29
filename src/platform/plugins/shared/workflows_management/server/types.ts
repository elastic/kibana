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
import type { HooksServiceSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { StaticToolRegistration } from '@kbn/agent-builder-server/tools';
import type {
  AlertingApiRequestHandlerContext,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ServerlessServerSetup } from '@kbn/serverless/server/types';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsApiRequestHandlerContext } from '@kbn/workflows/server/types';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { ZodObject } from '@kbn/zod/v4';
import type { SmlTypeDefinition } from './agent_builder/sml_types/types';
import type { WorkflowsManagementApi } from './api/workflows_management_api';
export interface WorkflowsServerPluginSetup {
  management: WorkflowsManagementApi;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsServerPluginStart {}

/**
 * AgentBuilder plugin setup contract interface.
 * Uses types from @kbn/agent-builder-server (shared package) instead of
 * importing from the plugin directly, to avoid a circular dependency.
 */
export interface AgentBuilderPluginSetupContract {
  agents: {
    register: (definition: BuiltInAgentDefinition) => void;
  };
  tools: {
    // x-pack/platform/plugins/shared/agent_builder/server/services/tools/types.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is used by the original type
    register: <RunInput extends ZodObject<any>>(tool: StaticToolRegistration<RunInput>) => void;
  };
  attachments: {
    registerType: (definition: AttachmentTypeDefinition) => void;
  };
  hooks: HooksServiceSetup;
  skills: {
    register: (definition: SkillDefinition) => void;
  };
  sml: {
    registerType: (definition: SmlTypeDefinition) => void;
  };
}

export interface WorkflowsServerPluginSetupDeps {
  features?: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  actions?: ActionsPluginSetupContract;
  alerting?: AlertingServerSetup;
  spaces: SpacesPluginSetup;
  serverless?: ServerlessServerSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface WorkflowsServerPluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
  security?: SecurityPluginStart;
  spaces: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  licensing: LicensingPluginStart;
}

export type WorkflowsRequestHandlerContext = CustomRequestHandlerContext<{
  workflows: WorkflowsApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
}>;

export type WorkflowsRouter = IRouter<WorkflowsRequestHandlerContext>;
