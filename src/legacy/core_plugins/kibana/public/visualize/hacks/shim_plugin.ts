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

// @ts-ignore
import { uiModules } from 'ui/modules';
// @ts-ignore
import { VisTypesRegistryProvider } from 'ui/registry/vis_types.js';
import { SavedObjectLoader, SavedObjectsClientProvider } from 'ui/saved_objects';
// @ts-ignore
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
// @ts-ignore
import { createLegacyClass } from 'ui/utils/legacy_class';
// @ts-ignore
import { VisProvider } from 'ui/vis/vis.js';
// @ts-ignore
import { updateOldState } from 'ui/vis/vis_update_state';
// @ts-ignore
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';

import { VisualizePlugin, VisualizeStartDependencies } from '../plugin';

const core = {};

const dependencies: VisualizeStartDependencies = {
  ui: {
    createLegacyClass,
    savedObjectLoader: SavedObjectLoader,
    savedObjectProvider: SavedObjectProvider,
    savedObjectsClientProvider: SavedObjectsClientProvider,
    uiModules,
  },
  management: {
    savedObjectManagementRegistry: {
      register(r: any) {
        savedObjectManagementRegistry.register(r);
      },
    },
  },
  visualize: {
    updateOldState,
    visProvider: VisProvider,
    visTypesRegistryProvider: VisTypesRegistryProvider,
  },
};

new VisualizePlugin().start(core, dependencies);
