/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ArrayNode } from '@elastic/charts';
import { isEqual } from 'lodash';
import type { PaletteRegistry, SeriesLayer, PaletteOutput, PaletteDefinition } from '@kbn/coloring';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { lightenColor } from '@kbn/charts-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { BucketColumns, ChartTypes, PartitionVisParams } from '../../../common/types';
import { DistinctSeries } from '../get_distinct_series';
import { getNodeLabel } from './get_node_labels';

const isTreemapOrMosaicChart = (shape: ChartTypes) =>
  [ChartTypes.MOSAIC, ChartTypes.TREEMAP].includes(shape);

export const byDataColorPaletteMap = (
  rows: Datatable['rows'],
  column: Partial<BucketColumns>,
  paletteDefinition: PaletteDefinition,
  { params }: PaletteOutput,
  formatters: Record<string, FieldFormat | undefined>,
  formatter: FieldFormatsStart
) => {
  const colorMap = new Map<string, string | undefined>(
    rows.map((item) => {
      const formattedName = getNodeLabel(
        item[column.id ?? ''],
        column,
        formatters,
        formatter.deserialize
      );
      return [formattedName, undefined];
    })
  );
  let rankAtDepth = 0;

  return {
    getColor: (item: unknown) => {
      const key = String(item);
      if (!colorMap.has(key)) return;

      let color = colorMap.get(key);
      if (color) {
        return color;
      }
      color =
        paletteDefinition.getCategoricalColor(
          [
            {
              name: key,
              totalSeriesAtDepth: colorMap.size,
              rankAtDepth: rankAtDepth++,
            },
          ],
          { behindText: false },
          params
        ) || undefined;

      colorMap.set(key, color);
      return color;
    },
  };
};

const getDistinctColor = (
  categoricalKey: string,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string } = {},
  visParams: PartitionVisParams,
  palettes: PaletteRegistry | null,
  syncColors: boolean,
  { parentSeries, allSeries }: DistinctSeries,
  formattedCategoricalKey: string
) => {
  // TODO move away from Record to a Map to avoid issues with reserved JS keywords
  if (Object.hasOwn(overwriteColors, categoricalKey)) {
    return overwriteColors[categoricalKey];
  }
  // this is for supporting old visualizations (created by vislib plugin)
  // it seems that there for some aggs, the uiState saved from vislib is
  // different from how es-charts handles it
  if (Object.hasOwn(overwriteColors, formattedCategoricalKey)) {
    return overwriteColors[formattedCategoricalKey];
  }

  const index = allSeries.findIndex((d) => isEqual(d, categoricalKey));
  const isSplitParentLayer = isSplitChart && parentSeries.includes(categoricalKey);
  return palettes?.get(visParams.palette.name).getCategoricalColor(
    [
      {
        name: categoricalKey,
        rankAtDepth: isSplitParentLayer
          ? parentSeries.findIndex((d) => d === categoricalKey)
          : index > -1
          ? index
          : 0,
        totalSeriesAtDepth: isSplitParentLayer ? parentSeries.length : allSeries.length || 1,
      },
    ],
    {
      maxDepth: 1,
      totalSeries: allSeries.length || 1,
      behindText: visParams.labels.show,
      syncColors,
    },
    visParams.palette?.params ?? { colors: [] }
  );
};

/**
 * This interface is introduced to simplify the used logic on testing an ArrayNode outside elastic-charts.
 * The SimplifiedArrayNode structure resembles the hierarchical configuration of an ArrayNode,
 * by presenting only the necessary fields used by the functions in this file.
 * The main difference is in the parent node, that to simplify this infinite tree structure we configured it as optional
 * so that in test I don't need to add a type assertion on an undefined parent as in elastic-charts.
 * The children are slight different in implementation and they accept `unknown` as key
 * due to the situation described in https://github.com/elastic/kibana/issues/153437
 */
export interface SimplifiedArrayNode {
  depth: ArrayNode['depth'];
  sortIndex: ArrayNode['depth'];
  parent?: SimplifiedArrayNode;
  children: Array<[unknown, SimplifiedArrayNode | undefined]>;
}

/**
 * This method returns the path of each hierarchical layer encountered from the given node
 * (a node of a hierarchical tree, currently a partition tree) up to the root of the hierarchy tree.
 * The resulting array only shows, for each parent, the name of the node, its child index within the parent branch
 * (called rankInDepth) and the total number of children of the parent.
 *
 */
const createSeriesLayers = (
  arrayNode: SimplifiedArrayNode,
  parentSeries: DistinctSeries['parentSeries'],
  isSplitChart: boolean,
  formatters: Record<string, FieldFormat | undefined>,
  formatter: FieldFormatsStart,
  column: Partial<BucketColumns>
): SeriesLayer[] => {
  const seriesLayers: SeriesLayer[] = [];
  let tempParent: typeof arrayNode | (typeof arrayNode)['parent'] = arrayNode;
  while (tempParent.parent && tempParent.depth > 0) {
    const nodeKey = tempParent.parent.children[tempParent.sortIndex][0];
    const seriesName = String(nodeKey);
    /**
     * FIXME this is a bad implementation: The `parentSeries` is an array of both `string` and `RangeKey` even if its type
     * is marked as `string[]` in `DistinctSeries`. Here instead we are checking if a stringified `RangeKey` is included into this array that
     * is conceptually wrong.
     * see https://github.com/elastic/kibana/issues/153437
     */
    const isSplitParentLayer = isSplitChart && parentSeries.includes(seriesName);
    const formattedName = getNodeLabel(nodeKey, column, formatters, formatter.deserialize);
    seriesLayers.unshift({
      // by construction and types `formattedName` should be always be a string, but I leave this Nullish Coalescing
      // because I don't trust much our formatting functions
      name: formattedName ?? seriesName,
      rankAtDepth: isSplitParentLayer
        ? // FIXME as described above this will not work correctly if the `nodeKey` is a `RangeKey`
          parentSeries.findIndex((name) => name === seriesName)
        : tempParent.sortIndex,
      totalSeriesAtDepth: isSplitParentLayer
        ? parentSeries.length
        : tempParent.parent.children.length,
    });
    tempParent = tempParent.parent;
  }
  return seriesLayers;
};

const overrideColors = (
  seriesLayers: SeriesLayer[],
  overwriteColors: { [key: string]: string },
  name: string
) => {
  let overwriteColor;

  if (Object.hasOwn(overwriteColors, name)) {
    overwriteColor = overwriteColors[name];
  }

  seriesLayers.forEach((layer) => {
    if (Object.keys(overwriteColors).includes(layer.name)) {
      overwriteColor = overwriteColors[layer.name];
    }
  });

  return overwriteColor;
};

export const getColor = (
  chartType: ChartTypes,
  // FIXME this could be both a string or a RangeKey see https://github.com/elastic/kibana/issues/153437
  categoricalKey: string, // could be RangeKey
  arrayNode: SimplifiedArrayNode,
  layerIndex: number,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string } = {},
  distinctSeries: DistinctSeries,
  { columnsLength, rowsLength }: { columnsLength: number; rowsLength: number },
  visParams: PartitionVisParams,
  palettes: PaletteRegistry | null,
  byDataPalette: ReturnType<typeof byDataColorPaletteMap> | undefined,
  syncColors: boolean,
  isDarkMode: boolean,
  formatter: FieldFormatsStart,
  column: Partial<BucketColumns>,
  formatters: Record<string, FieldFormat | undefined>
) => {
  // Mind the difference here: the contrast computation for the text ignores the alpha/opacity
  // therefore change it for dark mode
  const defaultColor = isDarkMode ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';

  const name = column.format
    ? formatter.deserialize(column.format).convert(categoricalKey) ?? ''
    : '';

  if (visParams.distinctColors) {
    return (
      getDistinctColor(
        categoricalKey,
        isSplitChart,
        overwriteColors,
        visParams,
        palettes,
        syncColors,
        distinctSeries,
        name
      ) || defaultColor
    );
  }

  const seriesLayers = createSeriesLayers(
    arrayNode,
    distinctSeries.parentSeries,
    isSplitChart,
    formatters,
    formatter,
    column
  );

  const overriddenColor = overrideColors(seriesLayers, overwriteColors, name);
  if (overriddenColor) {
    // this is necessary for supporting some old visualizations that defined their own colors (created by vislib plugin)
    return lightenColor(overriddenColor, seriesLayers.length, columnsLength);
  }

  if (chartType === ChartTypes.MOSAIC && byDataPalette && seriesLayers[1]) {
    return byDataPalette.getColor(seriesLayers[1].name) || defaultColor;
  }

  if (isTreemapOrMosaicChart(chartType)) {
    if (layerIndex < columnsLength - 1) {
      return defaultColor;
    }
    // for treemap use the top layer for coloring, for mosaic use the second layer
    if (seriesLayers.length > 1) {
      if (chartType === ChartTypes.MOSAIC) {
        seriesLayers.shift();
      } else {
        seriesLayers.pop();
      }
    }
  }

  const outputColor = palettes?.get(visParams.palette.name).getCategoricalColor(
    seriesLayers,
    {
      behindText: visParams.labels.show || isTreemapOrMosaicChart(chartType),
      maxDepth: columnsLength,
      totalSeries: rowsLength,
      syncColors,
    },
    visParams.palette?.params ?? { colors: [] }
  );

  return outputColor || defaultColor;
};
