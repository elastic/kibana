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

import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { TablePluginStartDependencies } from '../plugin';
// import { VisualizationContainer } from '../../visualizations/public';

const tableVisRegistry = new Map<HTMLElement, any>();

export const getTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) => ExpressionRenderDefinition<any> = (core, context) => ({
  name: 'table_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    handlers.onDestroy(() => {
      tableVisRegistry.delete(domNode);
    });

    if (!tableVisRegistry.has(domNode)) {
      const { getTableVisualizationControllerClass } = await import('./vis_controller');
      const Controller = getTableVisualizationControllerClass(core, context);
      tableVisRegistry.set(domNode, new Controller(domNode));
    }

    await tableVisRegistry.get(domNode)?.render(config.visData, config.visConfig, handlers.uiState);
    handlers.done();
  },
});
