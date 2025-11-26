/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { SETVAR_STEP_DEFINITION } from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePublicPluginSetup {
  // No public API needed
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePublicPluginStart {
  // No public API needed
}

export interface WorkflowsExtensionsExamplePublicPluginSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsExtensionsExamplePublicPluginStartDeps {
  // No dependencies needed
}

export class WorkflowsExtensionsExamplePlugin
  implements
    Plugin<
      WorkflowsExtensionsExamplePublicPluginSetup,
      WorkflowsExtensionsExamplePublicPluginStart,
      WorkflowsExtensionsExamplePublicPluginSetupDeps,
      WorkflowsExtensionsExamplePublicPluginStartDeps
    >
{
  public setup(
    _core: CoreSetup,
    plugins: WorkflowsExtensionsExamplePublicPluginSetupDeps
  ): WorkflowsExtensionsExamplePublicPluginSetup {
    // Register the setvar step metadata
    plugins.workflowsExtensions.registerStepMetadata({
      ...SETVAR_STEP_DEFINITION,
      label: 'Set Variable',
      description: 'Sets a variable in the workflow context that can be used in subsequent steps',
      icon: 'documentEdit',
      documentation: {
        summary: 'Sets a variable in the workflow context',
        details:
          'The setvar step allows you to store values in the workflow context that can be referenced in later steps using template syntax like {{ variables.name }}.',
        examples: [
          `# Set variables using key-value pairs
- name: set_vars
  type: workflows_step_example.setvar
  with:
    variables:
      myVar: "Hello World"
      count: 42
      enabled: true`,
          `# Set a single variable
- name: set_single_var
  type: workflows_step_example.setvar
  with:
    variables:
      message: "{{ workflow.name }}"`,
          `# Use variables in subsequent steps
- name: set_vars
  type: workflows_step_example.setvar
  with:
    variables:
      apiUrl: "https://api.example.com"
      timeout: 5000
- name: use_vars
  type: http
  with:
    url: "{{ steps.set_vars.output.variables.apiUrl }}"
    timeout: "{{ steps.set_vars.output.variables.timeout }}"`,
        ],
      },
    });

    return {};
  }

  public start(
    _core: CoreStart,
    _plugins: WorkflowsExtensionsExamplePublicPluginStartDeps
  ): WorkflowsExtensionsExamplePublicPluginStart {
    return {};
  }

  public stop() {}
}
