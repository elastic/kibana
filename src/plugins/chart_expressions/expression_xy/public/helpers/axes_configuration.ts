/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormatFactory } from '../types';
import {
  AxisConfig,
  YConfigResult,
  AxisExtentConfig,
  CommonXYDataLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from '../../common';
import type {
  IFieldFormat,
  SerializedFieldFormat,
} from '../../../../../plugins/field_formats/common';
import { isDataLayer } from './visualization';
import { Position } from '@elastic/charts';

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
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>,
  axes?: AxisConfig[]
) {
  const series: AxesSeries = {
    auto: [],
    left: [],
    right: [],
  };

  layers.forEach((layer, index) => {
    const { table, yConfig } = layer;
    layer.accessors.forEach((accessor) => {
      const yConfigByAccessor = yConfig?.find((config) => config.forAccessor === accessor);
      const axisConfigById = axes?.find(
        (axis) => yConfigByAccessor?.axisId && axis.id === yConfigByAccessor?.axisId
      );
      const key = axisConfigById?.id || 'auto';
      let formatter: SerializedFieldFormat = table.columns?.find((column) => column.id === accessor)
        ?.meta?.params || { id: 'number' };
      if (
        isDataLayer(layer) &&
        layer.seriesType.includes('percentage') &&
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
        ...(axisConfigById || {}),
      });
    });
  });

  const tablesExist = layers.filter(({ table }) => Boolean(table)).length > 0;

  series.auto.forEach((currentSeries) => {
    let key = Object.keys(series).find(
      (seriesKey) =>
        seriesKey !== 'auto' &&
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

export function getAxesConfiguration(
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>,
  shouldRotate: boolean,
  axes?: AxisConfig[],
  formatFactory?: FormatFactory
): GroupsConfiguration {
  const series = groupAxesByType(layers, axes);

  const axisGroups: GroupsConfiguration = [];

  axes?.forEach((axis) => {
    if (series[axis.id] && series[axis.id].length > 0) {
      axisGroups.push({
        groupId: axis.id,
        position: axis.position || Position.Left,
        formatter: formatFactory?.(series[axis.id][0].fieldFormat),
        series: series[axis.id].map(({ fieldFormat, ...currentSeries }) => currentSeries),
      });
    }
  });

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

export const getAxisConfig = (axesGroup?: GroupsConfiguration, yConfig?: YConfigResult) => {
  return axesGroup?.find(
    (axis) =>
      (yConfig?.axisId && yConfig.axisId === axis.groupId) ||
      axis.series.some(({ accessor }) => accessor === yConfig?.forAccessor)
  );
};

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
