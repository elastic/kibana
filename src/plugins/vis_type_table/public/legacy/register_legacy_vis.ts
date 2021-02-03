/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  usageCollection?.reportUiCounter('vis_type_table', METRIC_TYPE.LOADED, 'legacyVisEnabled');
  expressions.registerFunction(createTableVisLegacyFn);
  expressions.registerRenderer(getTableVisLegacyRenderer(core, context));
  visualizations.createBaseVisualization(tableVisLegacyTypeDefinition);
};
