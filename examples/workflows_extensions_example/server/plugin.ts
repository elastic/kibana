/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { registerStepDefinitions } from './step_types';
import { registerTriggers } from './triggers';

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
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePluginStartDeps {
  // No dependencies needed
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
  public setup(
    _core: CoreSetup,
    plugins: WorkflowsExtensionsExamplePluginSetupDeps
  ): WorkflowsExtensionsExamplePluginSetup {
    // Register steps and triggers on setup phase
    registerStepDefinitions(plugins.workflowsExtensions);
    registerTriggers(plugins.workflowsExtensions);

    return {};
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsExamplePluginStartDeps
  ): WorkflowsExtensionsExamplePluginStart {
    return {};
  }

  public stop() {}
}
