/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  WorkflowsStepExamplePluginSetup,
  WorkflowsStepExamplePluginSetupDeps,
  WorkflowsStepExamplePluginStart,
  WorkflowsStepExamplePluginStartDeps,
} from './types';
import { setvarStepDefinition } from './step_types/setvar_step';

/**
 * Example plugin demonstrating how to register custom workflow step types.
 *
 * This plugin shows the registerStep mechanism in action by implementing
 * a "setvar" step type that allows workflows to define and use variables.
 *
 * @example
 * Other plugins can follow this pattern to add their own custom step types:
 *
 * ```typescript
 * export class MyPlugin implements Plugin {
 *   setup(core, plugins) {
 *     plugins.workflowsExecutionEngine.registerStepType({
 *       id: 'my_custom_step',
 *       title: 'My Custom Step',
 *       description: 'Does something custom',
 *       inputSchema: z.object({ ... }),
 *       outputSchema: z.object({ ... }),
 *       handler: async (context) => { ... }
 *     });
 *   }
 * }
 * ```
 */
export class WorkflowsStepExamplePlugin
  implements
    Plugin<
      WorkflowsStepExamplePluginSetup,
      WorkflowsStepExamplePluginStart,
      WorkflowsStepExamplePluginSetupDeps,
      WorkflowsStepExamplePluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<WorkflowsStepExamplePluginStartDeps, WorkflowsStepExamplePluginStart>,
    plugins: WorkflowsStepExamplePluginSetupDeps
  ): WorkflowsStepExamplePluginSetup {
    this.logger.info('WorkflowsStepExample: Setup');

    // Register the setvar step type
    try {
      plugins.workflowsExecutionEngine.registerStepType(setvarStepDefinition);
      this.logger.info('Successfully registered "setvar" step type');
    } catch (error) {
      this.logger.error('Failed to register "setvar" step type', error);
      throw error;
    }

    return {};
  }

  public start(core: CoreStart): WorkflowsStepExamplePluginStart {
    this.logger.debug('WorkflowsStepExample: Start');
    return {};
  }

  public stop() {
    this.logger.debug('WorkflowsStepExample: Stop');
  }
}

