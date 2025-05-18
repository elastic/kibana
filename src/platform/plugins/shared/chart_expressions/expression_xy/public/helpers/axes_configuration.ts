/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import { FormatFactory } from '../types';
import {
  CommonXYDataLayerConfig,
  DataDecorationConfig,
  YAxisConfig,
  ReferenceLineDecorationConfig,
  YAxisConfigResult,
  XAxisConfigResult,
} from '../../common';
import { LayersFieldFormats } from './layers';

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
  /**
   * Axis group identificator. Format: `axis-${axis.id}` or just `left`/`right`.
   */
  groupId: string;
  position: Position;
  formatter?: IFieldFormat;
  series: Series[];
}

export type GroupsConfiguration = AxisConfiguration[];

export type AxesMap = Record<'left' | 'right', AxisConfiguration | undefined>;

export function isFormatterCompatible(
  formatter1: SerializedFieldFormat,
  formatter2: SerializedFieldFormat
) {
  return formatter1?.id === formatter2?.id;
}

const LEFT_GLOBAL_AXIS_ID = 'left';
const RIGHT_GLOBAL_AXIS_ID = 'right';

function isAxisSeriesAppliedForFormatter(
  series: FormattedMetric[],
  currentSeries: FormattedMetric
) {
  return series.every((leftSeries) =>
    isFormatterCompatible(leftSeries.fieldFormat, currentSeries.fieldFormat)
  );
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

  const leftSeriesKeys: string[] = [];
  const rightSeriesKeys: string[] = [];

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
      const key = axisConfigById?.id ? `axis-${axisConfigById?.id}` : 'auto';
      const fieldFormat = fieldFormats[layerId].yAccessors[yAccessor]!;
      if (!series[key]) {
        series[key] = [];
      }
      series[key].push({ layer: layer.layerId, accessor: yAccessor, fieldFormat });

      if (axisConfigById?.position === Position.Left) {
        leftSeriesKeys.push(key);
      } else if (axisConfigById?.position === Position.Right) {
        rightSeriesKeys.push(key);
      }
    });
  });

  const tablesExist = layers.filter(({ table }) => Boolean(table)).length > 0;

  if (!leftSeriesKeys.length) {
    leftSeriesKeys.push(LEFT_GLOBAL_AXIS_ID);
  }

  if (!rightSeriesKeys.length) {
    rightSeriesKeys.push(RIGHT_GLOBAL_AXIS_ID);
  }

  series.auto.forEach((currentSeries) => {
    const leftAxisGroupId = tablesExist
      ? leftSeriesKeys.find((leftSeriesKey) =>
          isAxisSeriesAppliedForFormatter(series[leftSeriesKey], currentSeries)
        )
      : undefined;

    const rightAxisGroupId = tablesExist
      ? rightSeriesKeys.find((rightSeriesKey) =>
          isAxisSeriesAppliedForFormatter(series[rightSeriesKey], currentSeries)
        )
      : undefined;

    const rightSeriesCount = rightSeriesKeys.reduce((acc, key) => {
      return acc + series[key].length;
    }, 0);
    const leftSeriesCount = leftSeriesKeys.reduce((acc, key) => {
      return acc + series[key].length;
    }, 0);

    let axisGroupId;

    if (leftSeriesCount === 0 || leftAxisGroupId) {
      axisGroupId = leftAxisGroupId || leftSeriesKeys[0];
    } else if (rightSeriesCount === 0 || rightAxisGroupId) {
      axisGroupId = rightAxisGroupId || rightSeriesKeys[0];
    } else if (rightSeriesCount >= leftSeriesCount) {
      axisGroupId = leftSeriesKeys[0];
    } else {
      axisGroupId = rightSeriesKeys[0];
    }

    series[axisGroupId].push(currentSeries);
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

export function getOriginalAxisPosition(position: Position, shouldRotate: boolean) {
  if (shouldRotate) {
    switch (position) {
      case Position.Bottom: {
        return Position.Left;
      }
      case Position.Right: {
        return Position.Bottom;
      }
      case Position.Top: {
        return Position.Right;
      }
      case Position.Left: {
        return Position.Top;
      }
    }
  }

  return position;
}

function axisGlobalConfig(position: Position, yAxisConfigs?: YAxisConfig[]) {
  return yAxisConfigs?.find((axis) => !axis.id && axis.position === position) || {};
}

const getXAxisConfig = (axisConfigs: Array<XAxisConfigResult | YAxisConfigResult> = []) =>
  axisConfigs.find(({ type }) => type === 'xAxisConfig');

export function getAxesConfiguration(
  layers: CommonXYDataLayerConfig[],
  shouldRotate: boolean,
  formatFactory: FormatFactory | undefined,
  fieldFormats: LayersFieldFormats,
  axisConfigs?: Array<XAxisConfigResult | YAxisConfigResult>
): GroupsConfiguration {
  const series = groupAxesByType(layers, fieldFormats, axisConfigs);

  const axisGroups: GroupsConfiguration = [];
  let position: Position;

  axisConfigs?.forEach((axis) => {
    const groupId = axis.id ? `axis-${axis.id}` : undefined;
    if (groupId && series[groupId] && series[groupId].length > 0) {
      position = getAxisPosition(axis.position || Position.Left, shouldRotate);
      axisGroups.push({
        groupId,
        formatter: formatFactory?.(series[groupId][0].fieldFormat),
        series: series[groupId].map(({ fieldFormat, ...currentSeries }) => currentSeries),
        ...axisGlobalConfig(axis.position || Position.Left, axisConfigs),
        ...axis,
        position,
      });
    }
  });

  if (series[LEFT_GLOBAL_AXIS_ID].length > 0) {
    position = shouldRotate ? Position.Bottom : Position.Left;
    axisGroups.push({
      groupId: LEFT_GLOBAL_AXIS_ID,
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(Position.Left, axisConfigs),
      position,
    });
  }

  if (series[RIGHT_GLOBAL_AXIS_ID].length > 0) {
    position = shouldRotate ? Position.Top : Position.Right;
    axisGroups.push({
      groupId: RIGHT_GLOBAL_AXIS_ID,
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(Position.Right, axisConfigs),
      position,
    });
  }

  const xAxisConfig = getXAxisConfig(axisConfigs);
  if (xAxisConfig) {
    position = getAxisPosition(xAxisConfig.position || Position.Bottom, shouldRotate);
    axisGroups.push({
      groupId: 'bottom',
      series: [],
      ...xAxisConfig,
      position,
    });
  }

  return axisGroups;
}
