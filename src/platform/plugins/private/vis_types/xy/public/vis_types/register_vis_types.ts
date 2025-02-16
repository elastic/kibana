/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisTypeDefinition, VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { VisParams } from '../types';

export function registerVisTypes(
  readOnly: boolean | undefined,
  visualizations: VisualizationsSetup
) {
  const visTypeMixin = {
    disableCreate: Boolean(readOnly),
    disableEdit: Boolean(readOnly),
    navigateToLens: async (vis, timefilter) => {
      const { convertToLens } = await import('../convert_to_lens');
      return vis ? convertToLens(vis, timefilter) : null;
    },
    getExpressionVariables: async (vis, timeFilter) => {
      const { convertToLens } = await import('../convert_to_lens');
      return {
        canNavigateToLens: Boolean(vis?.params ? await convertToLens(vis, timeFilter) : null),
      };
    },
  } as Partial<VisTypeDefinition<VisParams>>;

  visualizations.createBaseVisualization('area', async () => {
    const { areaVisType } = await import('./vis_types_module');
    return {
      ...areaVisType,
      ...visTypeMixin,
    };
  });

  visualizations.createBaseVisualization('line', async () => {
    const { lineVisType } = await import('./vis_types_module');
    return {
      ...lineVisType,
      ...visTypeMixin,
    };
  });

  visualizations.createBaseVisualization('histogram', async () => {
    const { histogramVisType } = await import('./vis_types_module');
    return {
      ...histogramVisType,
      ...visTypeMixin,
    };
  });

  visualizations.createBaseVisualization('horizontal_bar', async () => {
    const { horizontalBarVisType } = await import('./vis_types_module');
    return {
      ...horizontalBarVisType,
      ...visTypeMixin,
    };
  });
}
