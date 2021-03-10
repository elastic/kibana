/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { DashboardStart } from 'src/plugins/dashboard/public';
import { DiscoverStart } from 'src/plugins/discover/public';
import { HomePublicPluginSetup, FeatureCatalogueCategory } from 'src/plugins/home/public';
import { VisualizationsStart } from 'src/plugins/visualizations/public';
import { SavedObjectTaggingOssPluginStart } from 'src/plugins/saved_objects_tagging_oss/public';
import type { SpacesOssPluginStart } from 'src/plugins/spaces_oss/public';
import {
  SavedObjectsManagementActionService,
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnService,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
  SavedObjectsManagementServiceRegistry,
  ISavedObjectsManagementServiceRegistry,
} from './services';
import { registerServices } from './register_services';

export interface SavedObjectsManagementPluginSetup {
  actions: SavedObjectsManagementActionServiceSetup;
  columns: SavedObjectsManagementColumnServiceSetup;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
}

export interface SavedObjectsManagementPluginStart {
  actions: SavedObjectsManagementActionServiceStart;
  columns: SavedObjectsManagementColumnServiceStart;
}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  dashboard?: DashboardStart;
  visualizations?: VisualizationsStart;
  discover?: DiscoverStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  spacesOss?: SpacesOssPluginStart;
}

export class SavedObjectsManagementPlugin
  implements
    Plugin<
      SavedObjectsManagementPluginSetup,
      SavedObjectsManagementPluginStart,
      SetupDependencies,
      StartDependencies
    > {
  private actionService = new SavedObjectsManagementActionService();
  private columnService = new SavedObjectsManagementColumnService();
  private serviceRegistry = new SavedObjectsManagementServiceRegistry();

  public setup(
    core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>,
    { home, management }: SetupDependencies
  ): SavedObjectsManagementPluginSetup {
    const actionSetup = this.actionService.setup();
    const columnSetup = this.columnService.setup();

    if (home) {
      home.featureCatalogue.register({
        id: 'saved_objects',
        title: i18n.translate('savedObjectsManagement.objects.savedObjectsTitle', {
          defaultMessage: 'Saved Objects',
        }),
        description: i18n.translate('savedObjectsManagement.objects.savedObjectsDescription', {
          defaultMessage:
            'Import, export, and manage your saved searches, visualizations, and dashboards.',
        }),
        icon: 'savedObjectsApp',
        path: '/app/management/kibana/objects',
        showOnHomePage: false,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    const kibanaSection = management.sections.section.kibana;
    kibanaSection.registerApp({
      id: 'objects',
      title: i18n.translate('savedObjectsManagement.managementSectionLabel', {
        defaultMessage: 'Saved Objects',
      }),
      order: 1,
      mount: async (mountParams) => {
        const { mountManagementSection } = await import('./management_section');
        return mountManagementSection({
          core,
          serviceRegistry: this.serviceRegistry,
          mountParams,
        });
      },
    });

    // depends on `getStartServices`, should not be awaited
    registerServices(this.serviceRegistry, core.getStartServices);

    return {
      actions: actionSetup,
      columns: columnSetup,
      serviceRegistry: this.serviceRegistry,
    };
  }

  public start(core: CoreStart, { data }: StartDependencies) {
    const actionStart = this.actionService.start();
    const columnStart = this.columnService.start();

    return {
      actions: actionStart,
      columns: columnStart,
    };
  }
}
