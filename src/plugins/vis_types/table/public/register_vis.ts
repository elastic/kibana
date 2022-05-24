/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import { TablePluginSetupDependencies, TablePluginStartDependencies } from './plugin';
import { createTableVisFn } from './table_vis_fn';
import { getTableVisRenderer } from './table_vis_renderer';
import { tableVisTypeDefinition } from './table_vis_type';

export const registerTableVis = async (
  core: CoreSetup<TablePluginStartDependencies>,
  { expressions, visualizations }: TablePluginSetupDependencies
) => {
  const [coreStart] = await core.getStartServices();
  expressions.registerFunction(createTableVisFn);
  expressions.registerRenderer(getTableVisRenderer(coreStart));
  visualizations.createBaseVisualization(tableVisTypeDefinition);
};
