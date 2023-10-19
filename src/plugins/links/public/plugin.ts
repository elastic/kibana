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
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';

import { APP_NAME } from '../common';
import { LinksFactoryDefinition } from './embeddable';
import { CONTENT_ID, LATEST_VERSION } from '../common';
import { setKibanaServices } from './services/kibana_services';

export interface LinksSetupDependencies {
  embeddable: EmbeddableSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface LinksStartDependencies {
  embeddable: EmbeddableStart;
  dashboard: DashboardStart;
  presentationUtil: PresentationUtilPluginStart;
  contentManagement: ContentManagementPublicStart;
}

export class LinksPlugin
  implements Plugin<void, void, LinksSetupDependencies, LinksStartDependencies>
{
  constructor() {}

  public setup(core: CoreSetup<LinksStartDependencies>, plugins: LinksSetupDependencies) {
    core.getStartServices().then(([_, deps]) => {
      plugins.embeddable.registerEmbeddableFactory(CONTENT_ID, new LinksFactoryDefinition());

      plugins.contentManagement.registry.register({
        id: CONTENT_ID,
        version: {
          latest: LATEST_VERSION,
        },
        name: APP_NAME,
      });
    });
  }

  public start(core: CoreStart, plugins: LinksStartDependencies) {
    setKibanaServices(core, plugins);
    return {};
  }

  public stop() {}
}
