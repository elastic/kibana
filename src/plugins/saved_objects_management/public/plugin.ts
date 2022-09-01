/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  SavedObjectsManagementActionService,
  SavedObjectsManagementActionServiceSetup,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnService,
  SavedObjectsManagementColumnServiceSetup,
  SavedObjectsManagementColumnServiceStart,
} from './services';

import { SavedObjectManagementTypeInfo, SavedObjectGetRelationshipsResponse } from './types';
import {
  getAllowedTypes,
  getRelationships,
  getSavedObjectLabel,
  getDefaultTitle,
  parseQuery,
  getTagFindReferences,
} from './lib';

export interface SavedObjectsManagementPluginSetup {
  actions: SavedObjectsManagementActionServiceSetup;
  columns: SavedObjectsManagementColumnServiceSetup;
}

export interface SavedObjectsManagementPluginStart {
  actions: SavedObjectsManagementActionServiceStart;
  columns: SavedObjectsManagementColumnServiceStart;
  getAllowedTypes: () => Promise<SavedObjectManagementTypeInfo[]>;
  getRelationships: (
    type: string,
    id: string,
    savedObjectTypes: string[]
  ) => Promise<SavedObjectGetRelationshipsResponse>;
  getSavedObjectLabel: typeof getSavedObjectLabel;
  getDefaultTitle: typeof getDefaultTitle;
  parseQuery: typeof parseQuery;
  getTagFindReferences: typeof getTagFindReferences;
}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export interface StartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  spaces?: SpacesPluginStart;
}

export class SavedObjectsManagementPlugin
  implements
    Plugin<
      SavedObjectsManagementPluginSetup,
      SavedObjectsManagementPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private actionService = new SavedObjectsManagementActionService();
  private columnService = new SavedObjectsManagementColumnService();

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
          defaultMessage: 'Import, export, and manage your saved objects.',
        }),
        icon: 'savedObjectsApp',
        path: '/app/management/kibana/objects',
        showOnHomePage: false,
        category: 'admin',
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
          mountParams,
        });
      },
    });

    return {
      actions: actionSetup,
      columns: columnSetup,
    };
  }

  public start(_core: CoreStart, { spaces: spacesApi }: StartDependencies) {
    const actionStart = this.actionService.start(spacesApi);
    const columnStart = this.columnService.start(spacesApi);

    return {
      actions: actionStart,
      columns: columnStart,
      getAllowedTypes: () => getAllowedTypes(_core.http),
      getRelationships: (type: string, id: string, savedObjectTypes: string[]) =>
        getRelationships(_core.http, type, id, savedObjectTypes),
      getSavedObjectLabel,
      getDefaultTitle,
      parseQuery,
      getTagFindReferences,
    };
  }
}
