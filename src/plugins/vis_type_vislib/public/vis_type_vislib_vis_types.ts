/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { histogramVisTypeDefinition } from './histogram';
import { lineVisTypeDefinition } from './line';
import { areaVisTypeDefinition } from './area';
import { heatmapVisTypeDefinition } from './heatmap';
import { horizontalBarVisTypeDefinition } from './horizontal_bar';
import { gaugeVisTypeDefinition } from './gauge';
import { goalVisTypeDefinition } from './goal';

export { pieVisTypeDefinition } from './pie';

export const visLibVisTypeDefinitions = [
  histogramVisTypeDefinition,
  lineVisTypeDefinition,
  areaVisTypeDefinition,
  heatmapVisTypeDefinition,
  horizontalBarVisTypeDefinition,
  gaugeVisTypeDefinition,
  goalVisTypeDefinition,
];

export const convertedTypeDefinitions = [
  heatmapVisTypeDefinition,
  gaugeVisTypeDefinition,
  goalVisTypeDefinition,
];
