/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { TablePluginStartDependencies } from '../plugin';
import { TableVisRenderValue } from '../table_vis_fn';
import { TableVisLegacyController } from './vis_controller';

const tableVisRegistry = new Map<HTMLElement, TableVisLegacyController>();

export const getTableVisLegacyRenderer: (
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) => ExpressionRenderDefinition<TableVisRenderValue> = (core, context) => ({
  name: 'table_vis',
  reuseDomNode: true,
  render: async (domNode, config, handlers) => {
    let registeredController = tableVisRegistry.get(domNode);

    if (!registeredController) {
      const { getTableVisualizationControllerClass } = await import('./vis_controller');

      const Controller = getTableVisualizationControllerClass(core, context);
      registeredController = new Controller(domNode);
      tableVisRegistry.set(domNode, registeredController);

      handlers.onDestroy(() => {
        registeredController?.destroy();
        tableVisRegistry.delete(domNode);
      });
    }

    await registeredController.render(config.visData, config.visConfig, handlers);
    handlers.done();
  },
});
