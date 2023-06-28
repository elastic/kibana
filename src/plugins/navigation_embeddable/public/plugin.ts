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

import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';
import { NavigationEmbeddableFactoryDefinition } from './navigation_embeddable';
import { setKibanaServices } from './navigation_embeddable/services/kibana_services';
import {
  DashboardLinkFactory,
  DASHBOARD_LINK_EMBEDDABLE_TYPE,
} from './navigation_embeddable/dashboard_link/embeddable/dashboard_link_embeddable_factory';
import { linksService } from './navigation_embeddable/services/links_service';

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

      // Dashboard link embeddable factory setup
      const dashboardLinkFactoryDef = new DashboardLinkFactory();
      const dashboardLinkFactory = plugins.embeddable.registerEmbeddableFactory(
        DASHBOARD_LINK_EMBEDDABLE_TYPE,
        dashboardLinkFactoryDef
      )();
      linksService.registerLinkType(dashboardLinkFactory);
    });
  }

  public start(core: CoreStart, plugins: NavigationEmbeddableStartDependencies) {
    setKibanaServices(core, plugins);

    return {};
  }

  public stop() {}
}
