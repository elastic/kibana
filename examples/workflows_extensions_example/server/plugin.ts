/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import type { WorkflowsExtensionsRequestHandlerContext } from '@kbn/workflows-extensions/server';
import { registerEmitEventRoute } from './routes/emit_event';
import { registerEmitLoopRoute } from './routes/emit_loop';
import { registerStepDefinitions } from './step_types';
import { registerTriggers } from './triggers';
import { EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID } from './managed_workflows';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class WorkflowsExtensionsExamplePlugin extends Service {
  static readonly inject = ['core.http', 'workflowsExtensions.setup'];
  static readonly provide = 'workflowsExtensionsExample';

  constructor(ctx: Context) {
    super(ctx, 'workflowsExtensionsExample');
    const plugins = {
      workflowsExtensions: (ctx.get('workflowsExtensions.setup') as any).contract,
    };
    registerStepDefinitions(plugins.workflowsExtensions);
        registerTriggers(plugins.workflowsExtensions);

        plugins.workflowsExtensions.registerManagedWorkflowOwner(EXAMPLE_MANAGED_WORKFLOW_PLUGIN_ID);

        const router = (ctx.get('core.http') as any).createRouter() as import('@kbn/core/server').IRouter<WorkflowsExtensionsRequestHandlerContext>;
        registerEmitEventRoute(router);
        registerEmitLoopRoute(router);
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     void this.installManagedWorkflows(plugins);
    //     return {};
    //   }
  }
}
