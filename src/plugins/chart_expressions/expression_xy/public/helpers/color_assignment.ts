/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { DatatableRow } from '@kbn/expressions-plugin/common';
import { euiLightVars } from '@kbn/ui-theme';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { isDataLayer } from './visualization';
import { CommonXYDataLayerConfig, CommonXYLayerConfig } from '../../common';
import {
  LayerAccessorsTitles,
  LayerFieldFormats,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from './layers';
import {
  DatatablesWithFormatInfo,
  DatatableWithFormatInfo,
  hasMultipleLayersWithSplits,
} from './data_layers';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(layerId: string, seriesName: string): number;
  }
>;

function getSplitName(
  splitAccessors: Array<ExpressionValueVisDimension | string> = [],
  formattedDatatable: DatatableWithFormatInfo,
  row: DatatableRow,
  fieldFormats: LayerFieldFormats
) {
  return splitAccessors.reduce<string>((splitName, accessor) => {
    if (!formattedDatatable.table.columns.length) return;
    const splitAccessor = getAccessorByDimension(accessor, formattedDatatable.table.columns);
    const splitFormatterObj = fieldFormats.splitSeriesAccessors[splitAccessor];
    const name = formattedDatatable.formattedColumns[splitAccessor]
      ? row[splitAccessor]
      : splitFormatterObj.formatter.convert(row[splitAccessor]);
    if (splitName) {
      return `${splitName} - ${name}`;
    } else {
      return name;
    }
  }, '');
}

export const getAllSeries = (
  formattedDatatable: DatatableWithFormatInfo,
  splitAccessors: CommonXYDataLayerConfig['splitAccessors'] = [],
  accessors: Array<ExpressionValueVisDimension | string>,
  columnToLabel: CommonXYDataLayerConfig['columnToLabel'],
  titles: LayerAccessorsTitles,
  fieldFormats: LayerFieldFormats,
  accessorsCount: number,
  multipleLayersWithSplits: boolean
) => {
  if (!formattedDatatable.table) {
    return [];
  }

  const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};

  const allSeries: string[] = [];

  formattedDatatable.table.rows.forEach((row) => {
    const splitName = getSplitName(splitAccessors, formattedDatatable, row, fieldFormats);

    accessors.forEach((accessor) => {
      const yAccessor = getAccessorByDimension(accessor, formattedDatatable.table.columns);
      const yTitle = columnToLabelMap[yAccessor] ?? titles?.yTitles?.[yAccessor] ?? null;
      let name = yTitle;
      if (splitName) {
        name =
          accessorsCount > 1 || multipleLayersWithSplits ? `${splitName} - ${yTitle}` : splitName;
      }

      if (!allSeries.includes(name)) {
        allSeries.push(name);
      }
    });
  });

  return allSeries;
};

/**
 * This function joins every data series name available on each layer by the same color palette.
 * The returned function `getRank` should return the position of a series name in this unified list by palette.
 */
export function getColorAssignments(
  layers: CommonXYLayerConfig[],
  titles: LayersAccessorsTitles,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo
): ColorAssignments {
  const layersPerPalette: Record<string, CommonXYDataLayerConfig[]> = {};

  layers.forEach((layer) => {
    if (!isDataLayer(layer)) {
      return;
    }

    const palette = layer.palette?.name || 'default';
    if (!layersPerPalette[palette]) {
      layersPerPalette[palette] = [];
    }
    layersPerPalette[palette].push(layer);
  });
  const multipleLayersWithSplits = hasMultipleLayersWithSplits(layers);

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map((layer) => {
      const allSeries =
        getAllSeries(
          formattedDatatables[layer.layerId],
          layer.splitAccessors,
          layer.accessors,
          layer.columnToLabel,
          titles[layer.layerId],
          fieldFormats[layer.layerId],
          layer.accessors.length,
          multipleLayersWithSplits
        ) || [];

      return { numberOfSeries: allSeries.length, allSeries };
    });

    const totalSeriesCount = seriesPerLayer.reduce(
      (sum, perLayer) => sum + perLayer.numberOfSeries,
      0
    );
    return {
      totalSeriesCount,
      getRank(layerId: string, seriesName: string) {
        const layerIndex = paletteLayers.findIndex((layer) => layerId === layer.layerId);
        const currentSeriesPerLayer = seriesPerLayer[layerIndex];
        const rank = currentSeriesPerLayer.allSeries.indexOf(seriesName);
        return (
          (layerIndex === 0
            ? 0
            : seriesPerLayer
                .slice(0, layerIndex)
                .reduce((sum, perLayer) => sum + perLayer.numberOfSeries, 0)) +
          (rank !== -1 ? rank : 0)
        );
      },
    };
  });
}
