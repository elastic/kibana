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
import { HttpSetup } from '../../../../../../../core/public';
import { IndexPatternCreationManager, IndexPatternCreationConfig } from './creation';
import { IndexPatternListManager, IndexPatternListConfig } from './list';

interface SetupDependencies {
  httpClient: HttpSetup;
  home: HomePublicPluginSetup;
}

/**
 * Index patterns management service
 *
 * @internal
 */
export class IndexPatternManagementService {
  public setup({ httpClient, home }: SetupDependencies) {
    const creation = new IndexPatternCreationManager(httpClient);
    const list = new IndexPatternListManager();

    creation.add(IndexPatternCreationConfig);
    list.add(IndexPatternListConfig);

    home.featureCatalogue.register({
      id: 'index_patterns',
      title: i18n.translate('management.indexPatternHeader', {
        defaultMessage: 'Index Patterns',
      }),
      description: i18n.translate('management.indexPatternLabel', {
        defaultMessage:
          'Manage the index patterns that help retrieve your data from Elasticsearch.',
      }),
      icon: 'indexPatternApp',
      path: '/app/kibana#/management/kibana/index_patterns',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN,
    });

    return {
      creation,
      list,
    };
  }

  public stop() {
    // nothing to do here yet.
  }
}

/** @internal */
export type IndexPatternManagementSetup = ReturnType<IndexPatternManagementService['setup']>;
