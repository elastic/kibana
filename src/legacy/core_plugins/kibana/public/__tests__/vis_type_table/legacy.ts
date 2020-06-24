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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { npStart, npSetup } from 'ui/new_platform';
import {
  TableVisPlugin,
  TablePluginSetupDependencies,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/vis_type_table/public/plugin';

const plugins: Readonly<TablePluginSetupDependencies> = {
  expressions: npSetup.plugins.expressions,
  visualizations: npSetup.plugins.visualizations,
};

const pluginInstance = new TableVisPlugin({} as PluginInitializerContext);

export const setup = pluginInstance.setup(npSetup.core, plugins);
export const start = pluginInstance.start(npStart.core, {
  data: npStart.plugins.data,
  kibanaLegacy: npStart.plugins.kibanaLegacy,
});
