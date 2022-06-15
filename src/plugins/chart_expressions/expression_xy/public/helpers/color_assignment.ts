/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { Datatable } from '@kbn/expressions-plugin';
import { euiLightVars } from '@kbn/ui-theme';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import { FormatFactory } from '../types';
import { isDataLayer } from './visualization';
import { CommonXYDataLayerConfig, CommonXYLayerConfig } from '../../common';
import { getFormat } from './format';
import { LayerAccessorsTitles } from './layers';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(sortedLayer: CommonXYDataLayerConfig, seriesName: string): number;
  }
>;

export const getAllSeries = (
  table: Datatable,
  splitAccessors: CommonXYDataLayerConfig['splitAccessors'] = [],
  accessors: CommonXYDataLayerConfig['accessors'],
  columnToLabel: CommonXYDataLayerConfig['columnToLabel'],
  titles: LayerAccessorsTitles,
  formatFactory: FormatFactory
) => {
  const allSeries: string[] = [];
  if (!table) {
    return [];
  }

  const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};

  table.rows.forEach((row) => {
    let seriesName = '';
    splitAccessors.forEach((accessor) => {
      const splitColumn = getColumnByAccessor(accessor, table.columns);
      if (!splitColumn) return;
      const splitAccessor = getAccessorByDimension(accessor, table.columns);
      const columnFormatter =
        splitAccessor && formatFactory(getFormat(table.columns, splitAccessor));
      const name = columnFormatter
        ? columnFormatter.convert(row[splitAccessor])
        : row[splitAccessor];
      if (seriesName) {
        seriesName += ` - ${name}`;
      } else {
        seriesName = name;
      }
    });

    accessors.forEach((accessor) => {
      const yAccessor = getAccessorByDimension(accessor, table.columns);
      const yTitle = columnToLabelMap[yAccessor] ?? titles?.yTitles?.[yAccessor] ?? null;
      let name;
      if (seriesName) {
        name = accessors.length > 1 ? `${seriesName} - ${yTitle}` : seriesName;
      } else {
        name = yTitle;
      }
      if (!allSeries.includes(name)) {
        allSeries.push(name);
      }
    });
  });
  return allSeries;
};

export function getColorAssignments(
  layers: CommonXYLayerConfig[],
  formatFactory: FormatFactory,
  titles: LayerAccessorsTitles
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
          layer.table,
          layer.splitAccessors,
          layer.accessors,
          layer.columnToLabel,
          titles,
          formatFactory
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
