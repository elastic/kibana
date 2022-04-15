/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { FormatFactory } from '../types';
import {
  YAxisConfig,
  ExtendedYConfigResult,
  CommonXYDataLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
  ExtendedYConfig,
  YConfig,
} from '../../common';
import { AxisModes } from '../../common/constants';
import type {
  IFieldFormat,
  SerializedFieldFormat,
} from '../../../../../plugins/field_formats/common';
import { isDataLayer } from './visualization';

export interface Series {
  layer: number;
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
  return formatter1.id === formatter2.id;
}

export function groupAxesByType(
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>,
  axes?: YAxisConfig[]
) {
  const series: AxesSeries = {
    auto: [],
    left: [],
    right: [],
  };

  layers.forEach((layer, index) => {
    const { table } = layer;
    layer.accessors.forEach((accessor) => {
      const yConfig: Array<ExtendedYConfig | YConfig> | undefined = layer.yConfig;
      const yConfigByAccessor = yConfig?.find((config) => config.forAccessor === accessor);
      const axisConfigById = axes?.find(
        (axis) => yConfigByAccessor?.axisId && axis.id && axis.id === yConfigByAccessor?.axisId
      );
      const key = axisConfigById?.id || 'auto';
      let formatter: SerializedFieldFormat = table.columns?.find((column) => column.id === accessor)
        ?.meta?.params || { id: 'number' };
      if (
        isDataLayer(layer) &&
        (layer.isPercentage || axisConfigById?.mode === AxisModes.PERCENTAGE) &&
        formatter.id !== 'percent'
      ) {
        formatter = {
          id: 'percent',
          params: {
            pattern: '0.[00]%',
          },
        };
      }
      if (!series[key]) {
        series[key] = [];
      }
      series[key].push({
        layer: index,
        accessor,
        fieldFormat: formatter,
        axisId: yConfigByAccessor?.axisId,
      });
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
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>,
  shouldRotate: boolean,
  axes?: YAxisConfig[],
  formatFactory?: FormatFactory
): GroupsConfiguration {
  const series = groupAxesByType(layers, axes);

  const axisGroups: GroupsConfiguration = [];
  let position: Position;

  axes?.forEach((axis) => {
    if (axis.id && series[axis.id] && series[axis.id].length > 0) {
      position = getAxisPosition(axis.position || Position.Left, shouldRotate);
      axisGroups.push({
        groupId: `axis-${axis.id}`,
        position,
        formatter: formatFactory?.(series[axis.id][0].fieldFormat),
        series: series[axis.id].map(({ fieldFormat, ...currentSeries }) => currentSeries),
        ...axisGlobalConfig(position, axes),
        ...axis,
      });
    }
  });

  if (series.left.length > 0) {
    position = shouldRotate ? 'bottom' : 'left';
    axisGroups.push({
      groupId: 'left',
      position,
      formatter: formatFactory?.(series.left[0].fieldFormat),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(position, axes),
    });
  }

  if (series.right.length > 0) {
    position = shouldRotate ? 'top' : 'right';
    axisGroups.push({
      groupId: 'right',
      position,
      formatter: formatFactory?.(series.right[0].fieldFormat),
      series: series.right.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(position, axes),
    });
  }

  return axisGroups;
}

export const getAxisGroupConfig = (
  axesGroup?: GroupsConfiguration,
  yConfig?: ExtendedYConfigResult
) => {
  return axesGroup?.find(
    (axis) =>
      (yConfig?.axisId && yConfig.axisId === axis.groupId) ||
      axis.series.some(({ accessor }) => accessor === yConfig?.forAccessor)
  );
};
