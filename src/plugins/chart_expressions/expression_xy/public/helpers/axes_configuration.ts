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
import type { ExtendedReferenceLineDecorationConfig } from '../../common/types';
import {
  AxisExtentConfig,
  CommonXYDataLayerConfig,
  DataDecorationConfig,
  YAxisConfig,
  ReferenceLineDecorationConfig,
  ReferenceLineDecorationConfigResult,
} from '../../common';
import { LayersFieldFormats } from './layers';
import { isReferenceLineDecorationConfig } from './visualization';

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
  yAxisConfigs?: YAxisConfig[]
) {
  const series: AxesSeries = {
    auto: [],
    left: [],
    right: [],
  };

  layers.forEach((layer) => {
    const { layerId, table } = layer;
    layer.accessors.forEach((accessor) => {
      const dataDecorations:
        | Array<DataDecorationConfig | ReferenceLineDecorationConfig>
        | undefined = layer.decorations;
      const yAccessor = getAccessorByDimension(accessor, table.columns);
      const decorationByAccessor = dataDecorations?.find(
        (decorationConfig) => decorationConfig.forAccessor === yAccessor
      );
      const axisConfigById = yAxisConfigs?.find(
        (axis) =>
          decorationByAccessor?.axisId && axis.id && axis.id === decorationByAccessor?.axisId
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

function axisGlobalConfig(position: Position, yAxisConfigs?: YAxisConfig[]) {
  return yAxisConfigs?.find((axis) => !axis.id && axis.position === position) || {};
}

export function getAxesConfiguration(
  layers: CommonXYDataLayerConfig[],
  shouldRotate: boolean,
  formatFactory: FormatFactory | undefined,
  fieldFormats: LayersFieldFormats,
  yAxisConfigs?: YAxisConfig[]
): GroupsConfiguration {
  const series = groupAxesByType(layers, fieldFormats, yAxisConfigs);

  const axisGroups: GroupsConfiguration = [];
  let position: Position;

  yAxisConfigs?.forEach((axis) => {
    if (axis.id && series[axis.id] && series[axis.id].length > 0) {
      position = getAxisPosition(axis.position || Position.Left, shouldRotate);
      axisGroups.push({
        groupId: `axis-${axis.id}`,
        formatter: formatFactory?.(series[axis.id][0].fieldFormat),
        series: series[axis.id].map(({ fieldFormat, ...currentSeries }) => currentSeries),
        ...axisGlobalConfig(position, yAxisConfigs),
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
      ...axisGlobalConfig(position, yAxisConfigs),
      position,
    });
  }

  if (series.right.length > 0) {
    position = shouldRotate ? 'top' : 'right';
    axisGroups.push({
      groupId: 'right',
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(position, yAxisConfigs),
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
  decoration?: ReferenceLineDecorationConfigResult | ExtendedReferenceLineDecorationConfig
) => {
  return axesGroup?.find((axis) => {
    if (decoration?.axisId) {
      return axis.groupId.includes(decoration.axisId);
    }

    return decoration && isReferenceLineDecorationConfig(decoration)
      ? decoration.position === axis.position
      : axis.series.some(({ accessor }) => accessor === decoration?.forAccessor);
  });
};
