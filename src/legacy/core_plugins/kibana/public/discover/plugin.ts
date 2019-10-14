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

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import './saved_searches/saved_searches';
import './components/field_chooser/field_chooser';
import './angular';
import './doc_table/components/table_row';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';

function registerFeature() {
  FeatureCatalogueRegistryProvider.register(() => {
    return {
      id: 'discover',
      title: i18n.translate('kbn.discover.discoverTitle', {
        defaultMessage: 'Discover',
      }),
      description: i18n.translate('kbn.discover.discoverDescription', {
        defaultMessage: 'Interactively explore your data by querying and filtering raw documents.',
      }),
      icon: 'discoverApp',
      path: '/app/kibana#/discover',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    };
  });
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/prefer-interface
export type DiscoverSetup = {};
// eslint-disable-next-line @typescript-eslint/prefer-interface
export type DiscoverStart = {};
// eslint-disable-next-line @typescript-eslint/prefer-interface
export type DiscoverSetupDeps = {};
// eslint-disable-next-line @typescript-eslint/prefer-interface
export type DiscoverStartDeps = {};

export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: DiscoverSetupDeps): DiscoverSetup {
    registerFeature();
    return {};
  }

  start(core: CoreStart, plugins: DiscoverStartDeps): DiscoverStart {
    return {};
  }

  stop() {}
}
