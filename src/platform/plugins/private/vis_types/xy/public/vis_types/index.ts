/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import type { VisParams } from '../types';
import { areaVisTypeDefinition } from './area';
import { lineVisTypeDefinition } from './line';
import { histogramVisTypeDefinition } from './histogram';
import { horizontalBarVisTypeDefinition } from './horizontal_bar';

export const visTypesDefinitions = [
  areaVisTypeDefinition,
  lineVisTypeDefinition,
  histogramVisTypeDefinition,
  horizontalBarVisTypeDefinition,
].map<VisTypeDefinition<VisParams>>((defenition) => {
  return {
    ...defenition,
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
  };
});
