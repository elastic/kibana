/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import { FormatFactory } from '../types';
import type { ReferenceLineYConfig } from '../../common/types';
import {
  AxisExtentConfig,
  CommonXYDataLayerConfig,
  ExtendedYConfig,
  YConfig,
  YAxisConfig,
  ExtendedYConfigResult,
} from '../../common';
import { LayersFieldFormats } from './layers';
import { isReferenceLineYConfig } from './visualization';

export interface Series {
  layer: string;
  accessor: string;
}

interface FormattedMetric extends Series {
  fieldFormat: SerializedFieldFormat;
  axisId?: string;
}

interface AxesSeries {
  [key: string]: FormattedMetric[];
}

export interface AxisConfiguration extends Omit<YAxisConfig, 'id'> {
  groupId: string;
  position: 'left' | 'right' | 'bottom' | 'top';
  formatter?: IFieldFormat;
  series: Series[];
}

export type GroupsConfiguration = AxisConfiguration[];

export function isFormatterCompatible(
  formatter1: SerializedFieldFormat,
  formatter2: SerializedFieldFormat
) {
  return formatter1?.id === formatter2?.id;
}

export function groupAxesByType(
  layers: CommonXYDataLayerConfig[],
  fieldFormats: LayersFieldFormats,
  axes?: YAxisConfig[]
) {
  const series: AxesSeries = {
    auto: [],
    left: [],
    right: [],
  };

  layers.forEach((layer) => {
    const { layerId, table } = layer;
    layer.accessors.forEach((accessor) => {
      const yConfig: Array<YConfig | ExtendedYConfig> | undefined = layer.yConfig;
      const yAccessor = getAccessorByDimension(accessor, table.columns);
      const yConfigByAccessor = yConfig?.find((config) => config.forAccessor === yAccessor);
      const axisConfigById = axes?.find(
        (axis) => yConfigByAccessor?.axisId && axis.id && axis.id === yConfigByAccessor?.axisId
      );
      const key = axisConfigById?.id || 'auto';
      const fieldFormat = fieldFormats[layerId].yAccessors[yAccessor]!;
      if (!series[key]) {
        series[key] = [];
      }
      series[key].push({ layer: layer.layerId, accessor: yAccessor, fieldFormat });
    });
  });

  const tablesExist = layers.filter(({ table }) => Boolean(table)).length > 0;

  series.auto.forEach((currentSeries) => {
    let key = Object.keys(series).find(
      (seriesKey) =>
        seriesKey.includes('axis') &&
        series[seriesKey].length > 0 &&
        series[seriesKey].every((axisSeries) =>
          isFormatterCompatible(axisSeries.fieldFormat, currentSeries.fieldFormat)
        )
    );
    if (!key) {
      if (
        series.left.length === 0 ||
        (tablesExist &&
          series.left.every((leftSeries) =>
            isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
          ))
      ) {
        key = 'left';
      } else if (
        series.right.length === 0 ||
        (tablesExist &&
          series.left.every((leftSeries) =>
            isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
          ))
      ) {
        key = 'right';
      } else if (series.right.length >= series.left.length) {
        key = 'left';
      } else {
        key = 'right';
      }
    }

    series[key].push(currentSeries);
  });
  return series;
}

export function getAxisPosition(position: Position, shouldRotate: boolean) {
  if (shouldRotate) {
    switch (position) {
      case Position.Bottom: {
        return Position.Right;
      }
      case Position.Right: {
        return Position.Top;
      }
      case Position.Top: {
        return Position.Left;
      }
      case Position.Left: {
        return Position.Bottom;
      }
    }
  }

  return position;
}

function axisGlobalConfig(position: Position, axes?: YAxisConfig[]) {
  return axes?.find((axis) => !axis.id && axis.position === position) || {};
}

export function getAxesConfiguration(
  layers: CommonXYDataLayerConfig[],
  shouldRotate: boolean,
  formatFactory: FormatFactory | undefined,
  fieldFormats: LayersFieldFormats,
  axes?: YAxisConfig[]
): GroupsConfiguration {
  const series = groupAxesByType(layers, fieldFormats, axes);

  const axisGroups: GroupsConfiguration = [];
  let position: Position;

  axes?.forEach((axis) => {
    if (axis.id && series[axis.id] && series[axis.id].length > 0) {
      position = getAxisPosition(axis.position || Position.Left, shouldRotate);
      axisGroups.push({
        groupId: `axis-${axis.id}`,
        formatter: formatFactory?.(series[axis.id][0].fieldFormat),
        series: series[axis.id].map(({ fieldFormat, ...currentSeries }) => currentSeries),
        ...axisGlobalConfig(position, axes),
        ...axis,
        position,
      });
    }
  });

  if (series.left.length > 0) {
    position = shouldRotate ? 'bottom' : 'left';
    axisGroups.push({
      groupId: 'left',
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(position, axes),
      position,
    });
  }

  if (series.right.length > 0) {
    position = shouldRotate ? 'top' : 'right';
    axisGroups.push({
      groupId: 'right',
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(position, axes),
      position,
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

export const getAxisGroupConfig = (
  axesGroup?: GroupsConfiguration,
  yConfig?: ExtendedYConfigResult | ReferenceLineYConfig
) => {
  return axesGroup?.find((axis) => {
    if (yConfig?.axisId) {
      return axis.groupId.includes(yConfig.axisId);
    }

    return yConfig && isReferenceLineYConfig(yConfig)
      ? yConfig.position === axis.position
      : axis.series.some(({ accessor }) => accessor === yConfig?.forAccessor);
  });
};
