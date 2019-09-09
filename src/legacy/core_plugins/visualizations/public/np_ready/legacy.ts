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
/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup, npStart } from 'ui/new_platform';
// @ts-ignore
import { VisFiltersProvider, createFilter } from 'ui/vis/vis_filters';
// @ts-ignore
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';
// @ts-ignore
import { VisProvider as Vis } from 'ui/vis/index.js';
// @ts-ignore
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { visTypeAliasRegistry } from './types/vis_type_alias_registry';

import { plugin } from '.';

const pluginInstance = plugin({} as any);

export const setup = pluginInstance.setup(npSetup.core, {
  __LEGACY: {
    VisFiltersProvider,
    createFilter,

    Vis,
    VisFactoryProvider,
    VisTypesRegistryProvider,
    defaultFeedbackMessage,
    visTypeAliasRegistry,
  },
});
export const start = pluginInstance.start(npStart.core);
