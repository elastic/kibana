/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq, mapValues } from 'lodash';
import { euiLightVars } from '@kbn/ui-theme';
import { FormatFactory } from '../types';
import { isDataLayer } from './visualization';
import { CommonXYDataLayerConfigResult, CommonXYLayerConfigResult } from '../../common';

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const defaultReferenceLineColor = euiLightVars.euiColorDarkShade;

export type ColorAssignments = Record<
  string,
  {
    totalSeriesCount: number;
    getRank(
      sortedLayer: CommonXYDataLayerConfigResult,
      layerId: number,
      seriesKey: string,
      yAccessor: string
    ): number;
  }
>;

export function getColorAssignments(
  layers: CommonXYLayerConfigResult[],
  formatFactory: FormatFactory
): ColorAssignments {
  const layersPerPalette: Record<
    string,
    Array<{
      index: number;
      layer: CommonXYDataLayerConfigResult;
    }>
  > = {};

  layers.forEach((layer, index) => {
    if (!isDataLayer(layer)) {
      return;
    }

    const palette = layer.palette?.name || 'default';
    if (!layersPerPalette[palette]) {
      layersPerPalette[palette] = [];
    }
    layersPerPalette[palette].push({ layer, index });
  });

  return mapValues(layersPerPalette, (paletteLayers) => {
    const seriesPerLayer = paletteLayers.map(({ layer }) => {
      if (!layer.splitAccessor) {
        return { numberOfSeries: layer.accessors.length, splits: [] };
      }
      const splitAccessor = layer.splitAccessor;
      const column = layer.table.columns?.find(({ id }) => id === splitAccessor);
      const columnFormatter = column && formatFactory(column.meta.params);
      const splits =
        !column || !layer.table
          ? []
          : uniq(
              layer.table.rows.map((row) => {
                let value = row[splitAccessor];
                if (value && !isPrimitive(value)) {
                  value = columnFormatter?.convert(value) ?? value;
                } else {
                  value = String(value);
                }
                return value;
              })
            );
      return { numberOfSeries: (splits.length || 1) * layer.accessors.length, splits };
    });
    const totalSeriesCount = seriesPerLayer.reduce(
      (sum, perLayer) => sum + perLayer.numberOfSeries,
      0
    );
    return {
      totalSeriesCount,
      getRank(
        sortedLayer: CommonXYDataLayerConfigResult,
        layerId: number,
        seriesKey: string,
        yAccessor: string
      ) {
        const layerIndex = paletteLayers.findIndex(({ index }) => layerId === index);
        const currentSeriesPerLayer = seriesPerLayer[layerIndex];
        const splitRank = currentSeriesPerLayer.splits.indexOf(seriesKey);
        return (
          (layerIndex === 0
            ? 0
            : seriesPerLayer
                .slice(0, layerIndex)
                .reduce((sum, perLayer) => sum + perLayer.numberOfSeries, 0)) +
          (sortedLayer.splitAccessor && splitRank !== -1
            ? splitRank * sortedLayer.accessors.length
            : 0) +
          sortedLayer.accessors.indexOf(yAccessor)
        );
      },
    };
  });
}
