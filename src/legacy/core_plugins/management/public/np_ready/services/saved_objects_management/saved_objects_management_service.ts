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
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../../../plugins/home/public';
import { SavedObjectsManagementActionRegistry } from './saved_objects_management_action_registry';

interface SetupDependencies {
  home: HomePublicPluginSetup;
}

export class SavedObjectsManagementService {
  public setup({ home }: SetupDependencies) {
    home.featureCatalogue.register({
      id: 'saved_objects',
      title: i18n.translate('management.objects.savedObjectsTitle', {
        defaultMessage: 'Saved Objects',
      }),
      description: i18n.translate('management.objects.savedObjectsDescription', {
        defaultMessage:
          'Import, export, and manage your saved searches, visualizations, and dashboards.',
      }),
      icon: 'savedObjectsApp',
      path: '/app/kibana#/management/kibana/objects',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN,
    });

    return {
      registry: SavedObjectsManagementActionRegistry,
    };
  }

  public stop() {}
}

/** @internal */
export type SavedObjectsManagementServiceSetup = ReturnType<SavedObjectsManagementService['setup']>;
