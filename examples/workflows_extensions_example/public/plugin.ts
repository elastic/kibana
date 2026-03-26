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

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import {
  WORKFLOWS_EXTENSIONS_EXAMPLE_APP_ID,
  WORKFLOWS_EXTENSIONS_EXAMPLE_APP_TITLE,
} from '../common/constants';
import { ExampleExternalService } from '../common/external_service/external_service';
import { registerStepDefinitions } from './step_types';
import { registerTriggerDefinitions } from './triggers';

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
  developerExamples: {
    register: (config: { appId: string; title: string; description: string }) => void;
  };
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
    core: CoreSetup,
    plugins: WorkflowsExtensionsExamplePublicPluginSetupDeps
  ): WorkflowsExtensionsExamplePublicPluginSetup {
    // Register steps on setup phase
    registerStepDefinitions(plugins.workflowsExtensions, {
      externalService: new ExampleExternalService({
        'my-proxy': { name: 'Production Proxy', url: 'https://example.com' },
        'my-other-proxy': { name: 'Staging Proxy', url: 'https://example.com/other' },
        'my-third-proxy': { name: 'Development Proxy', url: 'https://example.com/third' },
        'my-fourth-proxy': { name: 'Testing Proxy', url: 'https://example.com/fourth' },
        'my-fifth-proxy': { name: 'Backup Proxy', url: 'https://example.com/fifth' },
      }),
    });
    registerTriggerDefinitions(plugins.workflowsExtensions);

    core.application.register({
      id: WORKFLOWS_EXTENSIONS_EXAMPLE_APP_ID,
      title: WORKFLOWS_EXTENSIONS_EXAMPLE_APP_TITLE,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    plugins.developerExamples.register({
      appId: WORKFLOWS_EXTENSIONS_EXAMPLE_APP_ID,
      title: WORKFLOWS_EXTENSIONS_EXAMPLE_APP_TITLE,
      description:
        'Register custom workflow steps and triggers, and emit events for the example trigger.',
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
