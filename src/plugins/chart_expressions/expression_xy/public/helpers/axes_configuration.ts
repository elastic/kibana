/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import { FormatFactory } from '../types';
import {
  AxisExtentConfig,
  CommonXYDataLayerConfig,
  ExtendedYConfig,
  YConfig,
  YScaleType,
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
  scale?: YScaleType;
}>;

export function isFormatterCompatible(
  formatter1: SerializedFieldFormat,
  formatter2: SerializedFieldFormat
) {
  return formatter1?.id === formatter2?.id;
}

export function groupAxesByType(
  layers: CommonXYDataLayerConfig[],
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
    const { layerId, table } = layer;
    layer.accessors.forEach((accessor) => {
      const yConfig: Array<YConfig | ExtendedYConfig> | undefined = layer.yConfig;
      const yAccessor = getAccessorByDimension(accessor, table.columns);
      const mode =
        yConfig?.find(({ forAccessor }) => forAccessor === yAccessor)?.axisMode || 'auto';
      const fieldFormat = fieldFormats[layerId].yAccessors[yAccessor]!;
      series[mode].push({ layer: layer.layerId, accessor: yAccessor, fieldFormat });
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
  fieldFormats: LayersFieldFormats,
  yLeftScale?: YScaleType,
  yRightScale?: YScaleType
): GroupsConfiguration {
  const series = groupAxesByType(layers, fieldFormats);

  const axisGroups: GroupsConfiguration = [];

  if (series.left.length > 0) {
    axisGroups.push({
      groupId: 'left',
      position: shouldRotate ? 'bottom' : 'left',
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      scale: yLeftScale,
    });
  }

  if (series.right.length > 0) {
    axisGroups.push({
      groupId: 'right',
      position: shouldRotate ? 'top' : 'right',
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      scale: yRightScale,
    });
  }

  return axisGroups;
}

export function validateExtent(hasBarOrArea: boolean, extent?: AxisExtentConfig) {
  const inclusiveZeroError =
    extent &&
    hasBarOrArea &&
    ((extent.lowerBound !== undefined && extent.lowerBound > 0) ||
      (extent.upperBound !== undefined && extent.upperBound) < 0);
  const boundaryError =
    extent &&
    extent.lowerBound !== undefined &&
    extent.upperBound !== undefined &&
    extent.upperBound <= extent.lowerBound;
  return { inclusiveZeroError, boundaryError };
}
