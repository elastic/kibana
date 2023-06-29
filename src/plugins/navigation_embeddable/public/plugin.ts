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
import { NAVIGATION_EMBEDDABLE_TYPE } from './embeddable';
import { NavigationEmbeddableFactoryDefinition } from './embeddable';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';
import { APP_NAME } from '../common/constants';
import { setKibanaServices } from './navigation_embeddable_services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}
export interface SetupDependencies {
  embeddable: EmbeddableSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface StartDependencies {
  embeddable: EmbeddableStart;
  contentManagement: ContentManagementPublicStart;
  dashboard: DashboardStart;
}

export class NavigationEmbeddablePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
    plugins.embeddable.registerEmbeddableFactory(
      NAVIGATION_EMBEDDABLE_TYPE,
      new NavigationEmbeddableFactoryDefinition()
    );

    plugins.contentManagement.registry.register({
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
      },
      name: APP_NAME,
    });
  }

  public start(core: CoreStart, plugins: StartDependencies) {
    setKibanaServices(core, plugins);
    return {};
  }

  public stop() {}
}
