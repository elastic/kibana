/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { StartDeps, SetupDeps } from './types';

export class ContentManagementExamplesPlugin
  implements Plugin<unknown, unknown, SetupDeps, StartDeps>
{
  public setup(core: CoreSetup<StartDeps>, { contentManagement, developerExamples }: SetupDeps) {
    developerExamples.register({
      appId: `contentManagementExamples`,
      title: `Content Management Examples`,
      description: 'Example plugin for the content management plugin',
    });

    core.application.register({
      id: `contentManagementExamples`,
      title: `Content Management Examples`,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./examples');
        const [coreStart, deps] = await core.getStartServices();
        return renderApp(coreStart, deps, params);
      },
    });

    contentManagement.registry.register({
      id: 'todos',
      version: {
        latest: 1,
      },
    });

    return {};
  }

  public start(core: CoreStart, deps: StartDeps) {
    return {};
  }

  public stop() {}
}
