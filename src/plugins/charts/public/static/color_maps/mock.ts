/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { colorSchemas, vislibColorMaps } from './color_maps';
import { getHeatmapColors } from './heatmap_color';
import { truncatedColorMaps, truncatedColorSchemas } from './truncated_color_maps';

// Note: Using actual values due to existing test dependencies
export const colorMapsMock = {
  getHeatmapColors: jest.fn(getHeatmapColors),
  vislibColorMaps,
  colorSchemas,
  truncatedColorMaps,
  truncatedColorSchemas,
} as any;
