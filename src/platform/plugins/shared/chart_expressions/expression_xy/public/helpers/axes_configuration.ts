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
import { getAccessorByDimension } from '@kbn/chart-expressions-common';
import type { FormatFactory } from '../types';
import type {
  CommonXYDataLayerConfig,
  DataDecorationConfig,
  YAxisConfig,
  ReferenceLineDecorationConfig,
  YAxisConfigResult,
  XAxisConfigResult,
  AxisFormatPolicy,
} from '../../common';
import type { LayersFieldFormats } from './layers';
import {
  groupAxisSeries,
  LEFT_AXIS_GROUP_ID,
  RIGHT_AXIS_GROUP_ID,
  type AxisSeriesDescriptor,
} from '../../common/axis_grouping';

export interface Series {
  layer: string;
  accessor: string;
}

interface FormattedMetric extends Series {
  fieldFormat: SerializedFieldFormat;
  axisId?: string;
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

export function groupAxesByType(
  layers: CommonXYDataLayerConfig[],
  fieldFormats: LayersFieldFormats,
  yAxisConfigs?: YAxisConfig[]
): Record<string, FormattedMetric[]> {
  const descriptors: AxisSeriesDescriptor[] = [];
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
      descriptors.push({
        layerId,
        accessor: yAccessor,
        fieldFormat,
        requestedGroupId: key,
        requestedGroupPosition: axisConfigById?.position,
      });
    });
  });

  const tablesExist = layers.filter(({ table }) => Boolean(table)).length > 0;
  const groupedSeries = groupAxisSeries(descriptors, tablesExist);
  const seriesByGroup: Record<string, FormattedMetric[]> = {};
  for (const [groupId, group] of Object.entries(groupedSeries)) {
    seriesByGroup[groupId] = group.map(({ layerId, accessor, fieldFormat }) => ({
      layer: layerId,
      accessor,
      fieldFormat,
    }));
  }
  return seriesByGroup;
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
  axisConfigs?: Array<XAxisConfigResult | YAxisConfigResult>,
  axisFormatPolicies?: AxisFormatPolicy[]
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
        formatter: formatFactory?.(
          axisFormatPolicies?.find((policy) => policy.groupId === groupId)?.formatter ??
            series[groupId][0].fieldFormat
        ),
        series: series[groupId].map(({ fieldFormat, ...currentSeries }) => currentSeries),
        ...axisGlobalConfig(axis.position || Position.Left, axisConfigs),
        ...axis,
        position,
      });
    }
  });

  if (series[LEFT_AXIS_GROUP_ID].length > 0) {
    position = shouldRotate ? Position.Bottom : Position.Left;
    axisGroups.push({
      groupId: LEFT_AXIS_GROUP_ID,
      formatter: formatFactory?.(
        axisFormatPolicies?.find((policy) => policy.groupId === LEFT_AXIS_GROUP_ID)?.formatter ??
          series.left[0].fieldFormat
      ),
      series: series.left.map(({ fieldFormat, ...currentSeries }) => currentSeries),
      ...axisGlobalConfig(Position.Left, axisConfigs),
      position,
    });
  }

  if (series[RIGHT_AXIS_GROUP_ID].length > 0) {
    position = shouldRotate ? Position.Top : Position.Right;
    axisGroups.push({
      groupId: RIGHT_AXIS_GROUP_ID,
      formatter: formatFactory?.(
        axisFormatPolicies?.find((policy) => policy.groupId === RIGHT_AXIS_GROUP_ID)?.formatter ??
          series.right[0].fieldFormat
      ),
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
