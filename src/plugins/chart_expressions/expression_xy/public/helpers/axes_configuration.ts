/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormatFactory } from '../types';
import {
  getAccessorByDimension,
  getFormatByAccessor,
} from '../../../../../plugins/visualizations/common/utils';
import {
  AxisExtentConfig,
  CommonXYDataLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from '../../common';
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
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>
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

  layers.forEach((layer, index) => {
    const { table } = layer;
    layer.accessors.forEach((accessor) => {
      const yAccessor = getAccessorByDimension(accessor, table?.columns || []);
      const mode =
        layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === yAccessor)?.axisMode ||
        'auto';
      let formatter: SerializedFieldFormat = getFormatByAccessor(
        accessor,
        table?.columns || []
      ) || {
        id: 'number',
      };
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
      series[mode].push({
        layer: index,
        accessor: yAccessor,
        fieldFormat: formatter,
      });
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
  layers: Array<CommonXYDataLayerConfigResult | CommonXYReferenceLineLayerConfigResult>,
  shouldRotate: boolean,
  formatFactory?: FormatFactory
): GroupsConfiguration {
  const series = groupAxesByType(layers);

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
