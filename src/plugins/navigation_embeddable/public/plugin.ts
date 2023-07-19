/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { NavigationEmbeddableFactoryDefinition } from './embeddable';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { APP_NAME, NAVIGATION_EMBEDDABLE_TYPE } from '../common/constants';
import { setKibanaServices } from './services/kibana_services';

export interface NavigationEmbeddableSetupDependencies {
  embeddable: EmbeddableSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface NavigationEmbeddableStartDependencies {
  embeddable: EmbeddableStart;
  contentManagement: ContentManagementPublicStart;
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
        new NavigationEmbeddableFactoryDefinition(deps.embeddable)
      );

      plugins.contentManagement.registry.register({
        id: CONTENT_ID,
        version: {
          latest: LATEST_VERSION,
        },
        name: APP_NAME,
      });
    });
  }

  public start(core: CoreStart, plugins: NavigationEmbeddableStartDependencies) {
    setKibanaServices(core, plugins);
    return {};
  }

  public stop() {}
}
