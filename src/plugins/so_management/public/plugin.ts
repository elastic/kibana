/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup, FeatureCatalogueCategory } from '../../home/public';
import {
  SavedObjectsManagementActionRegistry,
  ISavedObjectsManagementActionRegistry,
} from './services';

export interface SavedObjectsManagementPluginSetup {
  actionRegistry: ISavedObjectsManagementActionRegistry;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsManagementPluginStart {}

export interface SetupDependencies {
  home: HomePublicPluginSetup;
}

export class SavedObjectsManagementPlugin
  implements
    Plugin<
      SavedObjectsManagementPluginSetup,
      SavedObjectsManagementPluginStart,
      SetupDependencies,
      {}
    > {
  private actionRegistry = new SavedObjectsManagementActionRegistry();

  public setup(
    core: CoreSetup<{}>,
    { home }: SetupDependencies
  ): SavedObjectsManagementPluginSetup {
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
      path: '/app/kibana#/management/kibana/objects',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN,
    });

    return {
      actionRegistry: this.actionRegistry,
    };
  }

  public start(core: CoreStart) {
    return {};
  }
}
