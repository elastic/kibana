/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NodeColorAccessor, PATH_KEY } from '@elastic/charts';
import { lightenColor } from '@kbn/charts-plugin/public';
import { MultiFieldKey } from '@kbn/data-plugin/common';
import { getColorFactory } from '@kbn/coloring';
import { isMultiFieldKey } from '@kbn/data-plugin/common';
import { ChartTypes } from '../../../common/types';

export function getCategoryKeys(category: string | MultiFieldKey): string | string[] {
  return isMultiFieldKey(category) ? category.keys.map(String) : `${category}`;
}

/**
 * Get the color of a specific slice/section in Pie,donut,waffle and treemap.
 * These chart type shares the same color assignment mechanism.
 */
const getPieFillColor =
  (
    layerIndex: number,
    numOfLayers: number,
    getColorFn: ReturnType<typeof getColorFactory>
  ): NodeColorAccessor =>
  (_key, _sortIndex, node) => {
    const path = node[PATH_KEY];
    // the category used to color the pie/donut is at the third level of the path
    // first two are: small multiple and pie whole center.
    const category = getCategoryKeys(path[2].value);
    const color = getColorFn(category);
    // increase the lightness of the color on each layer.
    return lightenColor(color, layerIndex + 1, numOfLayers);
  };

/**
 * Get the color of a section in a Mosaic chart.
 * This chart has a slight variation in the way color are applied. Mosaic can represent up to 2 layers,
 * described in lens as the horizontal and vertical axes.
 * With a single layer the color is simply applied per each category, with 2 layer, the color is applied only
 * to the category that describe a row, not by column.
 */
const getMosaicFillColor =
  (
    layerIndex: number,
    numOfLayers: number,
    getColorFn: ReturnType<typeof getColorFactory>
  ): NodeColorAccessor =>
  (_key, _sortIndex, node) => {
    // Special case for 2 layer mosaic where the color is per rows and the columns are not colored
    if (numOfLayers === 2 && layerIndex === 0) {
      // transparent color will fallback to the kibana/context background
      return 'rgba(0,0,0,0)';
    }
    const path = node[PATH_KEY];

    // the category used to color the pie/donut is at the third level of the `path` when using a single layer mosaic
    // and are at fourth level of `path` when using 2 layer mosaic
    // first two are: small multiple and pie whole center.
    const category = getCategoryKeys(numOfLayers === 2 ? path[3].value : path[2].value);
    return getColorFn(category);
  };

export const getPartitionFillColor = (
  chartType: ChartTypes,
  layerIndex: number,
  numOfLayers: number,
  getColorFn: ReturnType<typeof getColorFactory>
): NodeColorAccessor => {
  return chartType === ChartTypes.MOSAIC
    ? getMosaicFillColor(layerIndex, numOfLayers, getColorFn)
    : getPieFillColor(layerIndex, numOfLayers, getColorFn);
};
