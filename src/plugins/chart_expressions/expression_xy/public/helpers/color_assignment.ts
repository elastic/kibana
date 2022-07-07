/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { DatatableRow } from '@kbn/expressions-plugin';
import { euiLightVars } from '@kbn/ui-theme';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { isDataLayer } from './visualization';
import { CommonXYDataLayerConfig, CommonXYLayerConfig } from '../../common';
import { LayerAccessorsTitles, LayerFieldFormats, LayersFieldFormats } from './layers';
import { DatatablesWithFormatInfo, DatatableWithFormatInfo } from './data_layers';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(sortedLayer: CommonXYDataLayerConfig, seriesName: string): number;
  }
>;

function getSplitName(
  splitAccessors: Array<ExpressionValueVisDimension | string> = [],
  formattedDatatable: DatatableWithFormatInfo,
  row: DatatableRow,
  fieldFormats: LayerFieldFormats
) {
  return splitAccessors.reduce<string>((splitName, accessor) => {
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
  fieldFormats: LayerFieldFormats
) => {
  if (!formattedDatatable.table) {
    return [];
  }

  const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};

  return formattedDatatable.table.rows.reduce<string[]>((acc, row) => {
    const splitName = getSplitName(splitAccessors, formattedDatatable, row, fieldFormats);

    const allRowSeries = accessors.reduce<string[]>((names, accessor) => {
      const yAccessor = getAccessorByDimension(accessor, formattedDatatable.table.columns);
      const yTitle = columnToLabelMap[yAccessor] ?? titles?.yTitles?.[yAccessor] ?? null;
      let name = yTitle;
      if (splitName) {
        name = accessors.length > 1 ? `${splitName} - ${yTitle}` : splitName;
      }

      return names.includes(name) ? names : [...names, name];
    }, []);

    // need only uniq values
    return [...new Set([...acc, ...allRowSeries])];
  }, []);
};

export function getColorAssignments(
  layers: CommonXYLayerConfig[],
  titles: LayerAccessorsTitles,
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

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map((layer) => {
      const allSeries =
        getAllSeries(
          formattedDatatables[layer.layerId],
          layer.splitAccessors,
          layer.accessors,
          layer.columnToLabel,
          titles,
          fieldFormats[layer.layerId]
        ) || [];

      return { numberOfSeries: allSeries.length, allSeries };
    });
    const totalSeriesCount = seriesPerLayer.reduce(
      (sum, perLayer) => sum + perLayer.numberOfSeries,
      0
    );
    return {
      totalSeriesCount,
      getRank(sortedLayer: CommonXYDataLayerConfig, seriesName: string) {
        const layerIndex = paletteLayers.findIndex(
          (layer) => sortedLayer.layerId === layer.layerId
        );
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
