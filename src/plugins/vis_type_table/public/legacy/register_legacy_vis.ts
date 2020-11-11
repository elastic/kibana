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

import { METRIC_TYPE } from '@kbn/analytics';
import { PluginInitializerContext, CoreSetup } from 'kibana/public';

import { TablePluginSetupDependencies, TablePluginStartDependencies } from '../plugin';
import { createTableVisLegacyFn } from './table_vis_legacy_fn';
import { getTableVisLegacyRenderer } from './table_vis_legacy_renderer';
import { tableVisLegacyTypeDefinition } from './table_vis_legacy_type';

export const registerLegacyVis = (
  core: CoreSetup<TablePluginStartDependencies>,
  { expressions, visualizations, usageCollection }: TablePluginSetupDependencies,
  context: PluginInitializerContext
) => {
  usageCollection?.reportUiStats('vis_type_table', METRIC_TYPE.LOADED, 'legacyVisEnabled');
  expressions.registerFunction(createTableVisLegacyFn);
  expressions.registerRenderer(getTableVisLegacyRenderer(core, context));
  visualizations.createBaseVisualization(tableVisLegacyTypeDefinition);
};
