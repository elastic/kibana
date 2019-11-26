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

import angular from 'angular';
import 'angular-sanitize';
import 'ui/collapsible_sidebar'; // used in default editor
import 'ui/vis/editors/default/sidebar';

import {
  IPrivate,
  legacyChrome,
  npSetup,
  npStart,
  SavedObjectRegistryProvider,
  VisEditorTypesRegistryProvider,
} from './legacy_imports';
import { VisualizePlugin, LegacyAngularInjectedDependencies } from './plugin';
import { start as data } from '../../../data/public/legacy';
import { start as embeddables } from '../../../embeddable_api/public/np_ready/public/legacy';
import { start as navigation } from '../../../navigation/public/legacy';
import { start as visualizations } from '../../../visualizations/public/np_ready/public/legacy';

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports above
 */
async function getAngularDependencies(): Promise<LegacyAngularInjectedDependencies> {
  const injector = await legacyChrome.dangerouslyGetActiveInjector();

  const Private = injector.get<IPrivate>('Private');

  const editorTypes = Private(VisEditorTypesRegistryProvider);
  const savedObjectRegistry = Private(SavedObjectRegistryProvider);

  return {
    legacyChrome,
    editorTypes,
    savedObjectRegistry,
    savedVisualizations: injector.get('savedVisualizations'),
  };
}

(async () => {
  const instance = new VisualizePlugin();
  instance.setup(npSetup.core, {
    ...npSetup.plugins,
    VisEditorTypesRegistryProvider,
    __LEGACY: {
      // angular is passed to kibana_services since it's used in editor.js
      angular,
      getAngularDependencies,
    },
  });
  instance.start(npStart.core, {
    ...npStart.plugins,
    data,
    npData: npStart.plugins.data,
    embeddables,
    navigation,
    visualizations,
  });
})();
