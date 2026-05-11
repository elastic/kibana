/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  WorkflowsExtensionsRequestHandlerContext,
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { registerEmitEventRoute } from './routes/emit_event';
import { registerEmitLoopRoute } from './routes/emit_loop';
import { registerStepDefinitions } from './step_types';
import { registerTriggers } from './triggers';
import {
  EXAMPLE_MANAGED_WORKFLOW_ID,
  EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID,
} from './managed_workflows';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePluginSetup {
  // No public API needed
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePluginStart {
  // No public API needed
}

export interface WorkflowsExtensionsExamplePluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface WorkflowsExtensionsExamplePluginStartDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export class WorkflowsExtensionsExamplePlugin
  implements
    Plugin<
      WorkflowsExtensionsExamplePluginSetup,
      WorkflowsExtensionsExamplePluginStart,
      WorkflowsExtensionsExamplePluginSetupDeps,
      WorkflowsExtensionsExamplePluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: WorkflowsExtensionsExamplePluginSetupDeps
  ): WorkflowsExtensionsExamplePluginSetup {
    registerStepDefinitions(plugins.workflowsExtensions);
    registerTriggers(plugins.workflowsExtensions);

    plugins.workflowsExtensions.registerManagedWorkflowOwner(EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID);

    const router = core.http.createRouter<WorkflowsExtensionsRequestHandlerContext>();
    registerEmitEventRoute(router);
    registerEmitLoopRoute(router);

    return {};
  }

  public start(
    _core: CoreStart,
    plugins: WorkflowsExtensionsExamplePluginStartDeps
  ): WorkflowsExtensionsExamplePluginStart {
    void this.installManagedWorkflows(plugins);
    return {};
  }

  public stop() {}

  private async installManagedWorkflows(
    plugins: WorkflowsExtensionsExamplePluginStartDeps
  ): Promise<void> {
    try {
      const client = await plugins.workflowsExtensions.initManagedWorkflowsClient(
        EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID
      );

      await client.install(EXAMPLE_MANAGED_WORKFLOW_ID, {
        spaceId: 'default',
        values: { recipient: 'World' },
      });

      await client.ready();

      this.logger.info('Workflows Extensions Example: Managed workflow installed successfully');
    } catch (error) {
      this.logger.warn('Workflows Extensions Example: Failed to install managed workflow', {
        error,
      });
    }
  }
}
