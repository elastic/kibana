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

import { PluginInitializerContext } from 'kibana/public';
import { npSetup, npStart } from 'ui/new_platform';
import { plugin } from '.';
import { setup as visualizations } from '../../visualizations/public/np_ready/public/legacy';
import { setup as data } from '../../data/public/legacy';
import { TimelionPluginSetupDependencies } from './plugin';
import { LegacyDependenciesPlugin } from './shim';

const setupPlugins: Readonly<TimelionPluginSetupDependencies> = {
  visualizations,
  data,
  expressions: npSetup.plugins.expressions,

  // Temporary solution
  // It will be removed when all dependent services are migrated to the new platform.
  __LEGACY: new LegacyDependenciesPlugin(),
};

const pluginInstance = plugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, setupPlugins);
export const start = pluginInstance.start(npStart.core);
