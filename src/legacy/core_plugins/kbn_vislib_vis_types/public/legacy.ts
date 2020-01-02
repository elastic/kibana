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

import { npSetup, npStart } from 'ui/new_platform';
import { PluginInitializerContext } from 'kibana/public';

/* eslint-disable prettier/prettier */
import {
  initializeHierarchicalTooltipFormatter,
  getHierarchicalTooltipFormatter,
  // @ts-ignore
} from 'ui/vis/components/tooltip/_hierarchical_tooltip_formatter';
import {
  initializePointSeriesTooltipFormatter,
  getPointSeriesTooltipFormatter,
  // @ts-ignore
} from 'ui/vis/components/tooltip/_pointseries_tooltip_formatter';
import {
  vislibSeriesResponseHandlerProvider,
  vislibSlicesResponseHandlerProvider,
  // @ts-ignore
} from 'ui/vis/response_handlers/vislib';
// @ts-ignore
import { vislibColor } from 'ui/vis/components/color/color';

import { plugin } from '.';
import {
  KbnVislibVisTypesPluginSetupDependencies,
  KbnVislibVisTypesPluginStartDependencies,
} from './plugin';
import {
  setup as visualizationsSetup,
  start as visualizationsStart,
} from '../../visualizations/public/np_ready/public/legacy';

const setupPlugins: Readonly<KbnVislibVisTypesPluginSetupDependencies> = {
  expressions: npSetup.plugins.expressions,
  visualizations: visualizationsSetup,
  __LEGACY: {
    initializeHierarchicalTooltipFormatter,
    getHierarchicalTooltipFormatter,
    initializePointSeriesTooltipFormatter,
    getPointSeriesTooltipFormatter,
    vislibSeriesResponseHandlerProvider,
    vislibSlicesResponseHandlerProvider,
    vislibColor,
  },
};

const startPlugins: Readonly<KbnVislibVisTypesPluginStartDependencies> = {
  expressions: npStart.plugins.expressions,
  visualizations: visualizationsStart,
};

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, setupPlugins);
export const start = pluginInstance.start(npStart.core, startPlugins);
