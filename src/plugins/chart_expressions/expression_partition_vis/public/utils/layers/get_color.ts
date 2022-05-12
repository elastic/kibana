/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ShapeTreeNode } from '@elastic/charts';
import { isEqual } from 'lodash';
import type { PaletteRegistry, SeriesLayer, PaletteOutput, PaletteDefinition } from '@kbn/coloring';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { lightenColor } from '@kbn/charts-plugin/public';
import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/public';
import { BucketColumns, ChartTypes, PartitionVisParams } from '../../../common/types';
import { DistinctSeries, getDistinctSeries } from '../get_distinct_series';

const isTreemapOrMosaicChart = (shape: ChartTypes) =>
  [ChartTypes.MOSAIC, ChartTypes.TREEMAP].includes(shape);

export const byDataColorPaletteMap = (
  rows: Datatable['rows'],
  columnId: string,
  paletteDefinition: PaletteDefinition,
  { params }: PaletteOutput
) => {
  const colorMap = new Map<string, string | undefined>(
    rows.map((item) => [String(item[columnId]), undefined])
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
  d: ShapeTreeNode,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string } = {},
  visParams: PartitionVisParams,
  palettes: PaletteRegistry | null,
  syncColors: boolean,
  { parentSeries, allSeries }: DistinctSeries,
  name: string
) => {
  let overwriteColor;
  // this is for supporting old visualizations (created by vislib plugin)
  // it seems that there for some aggs, the uiState saved from vislib is
  // different than the es-charts handle it
  if (overwriteColors.hasOwnProperty(name)) {
    overwriteColor = overwriteColors[name];
  }

  if (Object.keys(overwriteColors).includes(d.dataName.toString())) {
    overwriteColor = overwriteColors[d.dataName];
  }

  if (overwriteColor) {
    return overwriteColor;
  }

  const index = allSeries.findIndex((dataName) => isEqual(dataName, d.dataName));
  const isSplitParentLayer = isSplitChart && parentSeries.includes(d.dataName);
  return palettes?.get(visParams.palette.name).getCategoricalColor(
    [
      {
        name: d.dataName,
        rankAtDepth: isSplitParentLayer
          ? parentSeries.findIndex((dataName) => dataName === d.dataName)
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

const createSeriesLayers = (
  d: ShapeTreeNode,
  parentSeries: DistinctSeries['parentSeries'],
  isSplitChart: boolean
) => {
  const seriesLayers: SeriesLayer[] = [];
  let tempParent: typeof d | typeof d['parent'] = d;
  while (tempParent.parent && tempParent.depth > 0) {
    const seriesName = String(tempParent.parent.children[tempParent.sortIndex][0]);
    const isSplitParentLayer = isSplitChart && parentSeries.includes(seriesName);
    seriesLayers.unshift({
      name: seriesName,
      rankAtDepth: isSplitParentLayer
        ? parentSeries.findIndex((name) => name === seriesName)
        : tempParent.sortIndex,
      totalSeriesAtDepth: isSplitParentLayer
        ? parentSeries.length
        : tempParent.parent.children.length,
    });
    tempParent = tempParent.parent;
  }
  return seriesLayers;
};

const overrideColorForOldVisualization = (
  seriesLayers: SeriesLayer[],
  overwriteColors: { [key: string]: string },
  name: string
) => {
  let overwriteColor;
  // this is for supporting old visualizations (created by vislib plugin)
  // it seems that there for some aggs, the uiState saved from vislib is
  // different than the es-charts handle it
  if (overwriteColors.hasOwnProperty(name)) {
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
  d: ShapeTreeNode,
  layerIndex: number,
  isSplitChart: boolean,
  overwriteColors: { [key: string]: string } = {},
  columns: Array<Partial<BucketColumns>>,
  rows: DatatableRow[],
  visParams: PartitionVisParams,
  palettes: PaletteRegistry | null,
  byDataPalette: ReturnType<typeof byDataColorPaletteMap> | undefined,
  syncColors: boolean,
  isDarkMode: boolean,
  formatter: FieldFormatsStart,
  format?: BucketColumns['format']
) => {
  const distinctSeries = getDistinctSeries(rows, columns);
  const { parentSeries } = distinctSeries;
  const dataName = d.dataName;

  // Mind the difference here: the contrast computation for the text ignores the alpha/opacity
  // therefore change it for dask mode
  const defaultColor = isDarkMode ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';

  let name = '';
  if (format) {
    name = formatter.deserialize(format).convert(dataName) ?? '';
  }

  if (visParams.distinctColors) {
    return (
      getDistinctColor(
        d,
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

  const seriesLayers = createSeriesLayers(d, parentSeries, isSplitChart);

  const overwriteColor = overrideColorForOldVisualization(seriesLayers, overwriteColors, name);
  if (overwriteColor) {
    return lightenColor(overwriteColor, seriesLayers.length, columns.length);
  }

  if (chartType === ChartTypes.MOSAIC && byDataPalette && seriesLayers[1]) {
    return byDataPalette.getColor(seriesLayers[1].name) || defaultColor;
  }

  if (isTreemapOrMosaicChart(chartType)) {
    if (layerIndex < columns.length - 1) {
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
      maxDepth: columns.length,
      totalSeries: rows.length,
      syncColors,
    },
    visParams.palette?.params ?? { colors: [] }
  );

  return outputColor || defaultColor;
};
