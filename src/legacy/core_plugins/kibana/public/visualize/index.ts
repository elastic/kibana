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

import 'angular-sanitize';
import 'ui/collapsible_sidebar'; // used in default editor
import 'ui/vis/editors/default/sidebar';

import chrome from 'ui/chrome';
import { docTitle } from 'ui/doc_title/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { npSetup, npStart } from 'ui/new_platform';
import { IPrivate } from 'ui/private';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
// @ts-ignore
import { VisEditorTypesRegistryProvider } from 'ui/registry/vis_editor_types';
import { SavedObjectRegistryProvider, SavedObjectsClientProvider } from 'ui/saved_objects';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share';

import { VisualizePlugin, LegacyAngularInjectedDependencies } from './plugin';
import { localApplicationService } from '../local_application_service';
import { start as dataStart } from '../../../data/public/legacy';
import {
  start as embeddables,
  setup as embeddableSetup,
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
  const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);
  const savedObjectRegistry = Private(SavedObjectRegistryProvider);
  const savedObjectClient = Private(SavedObjectsClientProvider);
  const editorTypes = Private(VisEditorTypesRegistryProvider);

  return {
    chromeLegacy: chrome,
    editorTypes,
    queryFilter,
    savedObjectClient,
    savedObjectRegistry,
    savedDashboards: injector.get('savedDashboards'),
    savedVisualizations: injector.get('savedVisualizations'),
    shareContextMenuExtensions,
  };
}

(async () => {
  const instance = new VisualizePlugin();
  instance.setup(npSetup.core, {
    embeddableSetup,
    __LEGACY: {
      docTitle,
      getAngularDependencies,
      FeatureCatalogueRegistryProvider,
      localApplicationService,
    },
  });
  instance.start(npStart.core, {
    dataStart,
    embeddables,
    navigation,
    visualizations,
  });
})();
