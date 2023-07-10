/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';

import { NAVIGATION_EMBEDDABLE_TYPE } from './embeddable';
import { setKibanaServices } from './services/kibana_services';
import { NavigationEmbeddableFactoryDefinition } from './embeddable';

export interface NavigationEmbeddableSetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface NavigationEmbeddableStartDependencies {
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
}

export class NavigationEmbeddablePlugin
  implements
    Plugin<
      void,
      void,
      NavigationEmbeddableSetupDependencies,
      NavigationEmbeddableStartDependencies
    >
{
  constructor() {}

  public setup(
    core: CoreSetup<NavigationEmbeddableStartDependencies>,
    plugins: NavigationEmbeddableSetupDependencies
  ) {
    core.getStartServices().then(([_, deps]) => {
      plugins.embeddable.registerEmbeddableFactory(
        NAVIGATION_EMBEDDABLE_TYPE,
        new NavigationEmbeddableFactoryDefinition()
      );
    });
  }

  public start(core: CoreStart, plugins: NavigationEmbeddableStartDependencies) {
    setKibanaServices(core, plugins);
  }

  public stop() {}
}
