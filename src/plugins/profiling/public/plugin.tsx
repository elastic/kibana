/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { getServices } from './services';

export class ProdfilerPlugin implements Plugin {
  public setup(core: CoreSetup) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'prodfiler',
      title: 'Prodfiler',
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const startServices = getServices(coreStart);
        const { renderApp } = await import('./app');
        return renderApp(startServices, element);
      },
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
