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

import 'angular-sanitize'; // used in visualization_editor.js and visualization.js
import 'ui/collapsible_sidebar'; // used in default editor
import 'ui/vis/editors/default/sidebar';

import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { npSetup, npStart } from 'ui/new_platform';
import { SavedObjectRegistryProvider, SavedObjectsClientProvider } from 'ui/saved_objects';
import { docTitle } from 'ui/doc_title/doc_title';
import chrome from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing/get_unhashable_states_provider';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { VisualizePlugin, LegacyAngularInjectedDependencies } from './plugin';
import { start as data } from '../../../data/public/legacy';
import { localApplicationService } from '../local_application_service';
import {
  start as embeddables,
  setup as embeddable,
} from '../../../embeddable_api/public/np_ready/public/legacy';
import { start as navigation } from '../../../navigation/public/legacy';
import { start as visualizations } from '../../../visualizations/public/np_ready/public/legacy';

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports above
 */
async function getAngularDependencies(): Promise<LegacyAngularInjectedDependencies> {
  const injector = await chrome.dangerouslyGetActiveInjector();

  const Private = injector.get<IPrivate>('Private');

  const queryFilter = Private(FilterBarQueryFilterProvider);
  const getUnhashableStates = Private(getUnhashableStatesProvider);
  const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);
  const savedObjectRegistry = Private(SavedObjectRegistryProvider);
  const savedObjectClient = Private(SavedObjectsClientProvider);
  const editorTypes = Private(VisEditorTypesRegistryProvider);

  return {
    queryFilter,
    getUnhashableStates,
    shareContextMenuExtensions,
    config: injector.get('config'),
    savedObjectClient,
    savedObjectRegistry,
    savedDashboards: injector.get('savedDashboards'),
    savedVisualizations: injector.get('savedVisualizations'),
    editorTypes,
  };
}

(async () => {
  const instance = new VisualizePlugin();
  await instance.setup(npSetup.core, {
    __LEGACY: {
      localApplicationService,
      getAngularDependencies,
      FeatureCatalogueRegistryProvider,
      docTitle,
    },
    embeddable,
  });
  instance.start(npStart.core, {
    data,
    embeddables,
    navigation,
    visualizations,
  });
})();
