/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { FormatFactory } from '../types';
import {
  CommonXYDataLayerConfig,
  CommonXYReferenceLineLayerConfig,
  ExtendedYConfig,
  YConfig,
} from '../../common';
import { LayersFieldFormats } from './layers';

export interface Series {
  layer: string;
  accessor: string;
}

interface FormattedMetric extends Series {
  fieldFormat: SerializedFieldFormat;
}

export type GroupsConfiguration = Array<{
  groupId: 'left' | 'right';
  position: 'left' | 'right' | 'bottom' | 'top';
  formatter?: IFieldFormat;
  series: Series[];
}>;

export function isFormatterCompatible(
  formatter1: SerializedFieldFormat,
  formatter2: SerializedFieldFormat
) {
  return formatter1.id === formatter2.id;
}

export function groupAxesByType(
  layers: Array<CommonXYDataLayerConfig | CommonXYReferenceLineLayerConfig>,
  fieldFormats: LayersFieldFormats
) {
  const series: {
    auto: FormattedMetric[];
    left: FormattedMetric[];
    right: FormattedMetric[];
    bottom: FormattedMetric[];
  } = {
    auto: [],
    left: [],
    right: [],
    bottom: [],
  };

  layers.forEach((layer) => {
    const { layerId } = layer;
    layer.accessors.forEach((accessor) => {
      const yConfig: Array<YConfig | ExtendedYConfig> | undefined = layer.yConfig;
      const mode = yConfig?.find(({ forAccessor }) => forAccessor === accessor)?.axisMode || 'auto';
      const fieldFormat = fieldFormats[layerId].yAccessors[accessor]!;
      series[mode].push({ layer: layer.layerId, accessor, fieldFormat });
    });
  });

  const tablesExist = layers.filter(({ table }) => Boolean(table)).length > 0;

  series.auto.forEach((currentSeries) => {
    if (
      series.left.length === 0 ||
      (tablesExist &&
        series.left.every((leftSeries) =>
          isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
        ))
    ) {
      series.left.push(currentSeries);
    } else if (
      series.right.length === 0 ||
      (tablesExist &&
        series.left.every((leftSeries) =>
          isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
        ))
    ) {
      series.right.push(currentSeries);
    } else if (series.right.length >= series.left.length) {
      series.left.push(currentSeries);
    } else {
      series.right.push(currentSeries);
    }
  });
  return series;
}

export function getAxesConfiguration(
  layers: CommonXYDataLayerConfig[],
  shouldRotate: boolean,
  formatFactory: FormatFactory | undefined,
  fieldFormats: LayersFieldFormats
): GroupsConfiguration {
  const series = groupAxesByType(layers, fieldFormats);

  const axisGroups: GroupsConfiguration = [];

  if (series.left.length > 0) {
    axisGroups.push({
      groupId: 'left',
      position: shouldRotate ? 'bottom' : 'left',
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
    });
  }

  if (series.right.length > 0) {
    axisGroups.push({
      groupId: 'right',
      position: shouldRotate ? 'top' : 'right',
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
    });
  }

  return axisGroups;
}

type LayerGroups = Series & {
  groupId: 'left' | 'right';
};

export const getGroupsAndAccessorsByLayers = (
  groups: GroupsConfiguration
): Record<string, LayerGroups[]> => {
  return groups.reduce<Record<string, LayerGroups[]>>((groupsByLayers, group) => {
    return group.series.reduce<Record<string, LayerGroups[]>>((layers, series) => {
      const layer = layers[series.layer] ?? [];
      const prevLayer = groupsByLayers[series.layer] ?? [];
      return {
        ...layers,
        [series.layer]: [...prevLayer, ...layer, { ...series, groupId: group.groupId }],
      };
    }, {});
  }, {});
};
