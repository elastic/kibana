/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { identity } from 'lodash';

import { AxisSpec, TickFormatter, YDomainRange, ScaleType as ECScaleType } from '@elastic/charts';

import { LabelRotation } from '@kbn/charts-plugin/public';
import { BUCKET_TYPES } from '@kbn/data-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';

import {
  Aspect,
  CategoryAxis,
  Grid,
  AxisConfig,
  TickOptions,
  ScaleConfig,
  Scale,
  ScaleType,
  AxisType,
  XScaleType,
  YScaleType,
  SeriesParam,
} from '../types';

export function getAxis<S extends XScaleType | YScaleType>(
  { type, title: axisTitle, labels, scale: axisScale, ...axis }: CategoryAxis,
  { categoryLines, valueAxis }: Grid,
  { params, format, formatter, title: fallbackTitle = '', aggType }: Aspect,
  seriesParams: SeriesParam[],
  isDateHistogram = false,
  useMultiLayerTimeAxis = false,
  darkMode = false
): AxisConfig<S> {
  const isCategoryAxis = type === AxisType.Category;
  // Hide unassigned axis, not supported in elastic charts
  // TODO: refactor when disallowing unassigned axes
  // https://github.com/elastic/kibana/issues/82752
  const show =
    (isCategoryAxis || seriesParams.some(({ valueAxis: id }) => id === axis.id)) && axis.show;
  const groupId = axis.id;

  const grid = isCategoryAxis
    ? {
        show: categoryLines,
      }
    : {
        show: valueAxis === axis.id,
      };
  // Date range formatter applied on xAccessor
  const tickFormatter =
    aggType === BUCKET_TYPES.DATE_RANGE || aggType === BUCKET_TYPES.RANGE ? identity : formatter;
  const ticks: TickOptions = {
    formatter: tickFormatter,
    labelFormatter: getLabelFormatter(labels.truncate, tickFormatter),
    show: labels.show,
    rotation: labels.rotate,
    showOverlappingLabels: !labels.filter,
    showDuplicates: !labels.filter,
  };
  const scale = getScale<S>(axisScale, params, format, isCategoryAxis);
  const title = axisTitle.text || fallbackTitle;
  const fallbackRotation =
    isCategoryAxis && isDateHistogram ? LabelRotation.Horizontal : LabelRotation.Vertical;

  return {
    ...axis,
    show,
    groupId,
    title,
    ticks,
    grid,
    scale,
    style: getAxisStyle(useMultiLayerTimeAxis, darkMode, ticks, title, fallbackRotation),
    domain: getAxisDomain(scale, isCategoryAxis),
    integersOnly: aggType === 'count',
    timeAxisLayerCount: useMultiLayerTimeAxis ? 3 : 0,
  };
}

function getLabelFormatter(
  truncate?: number | null,
  formatter?: TickFormatter
): TickFormatter | undefined {
  if (truncate === null || truncate === undefined) {
    return formatter;
  }

  return (value: any) => {
    const finalValue = `${formatter ? formatter(value) : value}`;

    if (finalValue.length > truncate) {
      return `${finalValue.slice(0, truncate)}...`;
    }

    return finalValue;
  };
}

function getScaleType(
  scale?: Scale,
  isNumber?: boolean,
  isTime = false,
  isHistogram = false
): ECScaleType | undefined {
  if (isTime) return ECScaleType.Time;
  if (isHistogram) return ECScaleType.Linear;

  if (!isNumber) {
    return ECScaleType.Ordinal;
  }

  const type = scale?.type;
  if (type === ScaleType.SquareRoot) {
    return ECScaleType.Sqrt;
  }

  return type;
}

export function getScale<S extends XScaleType | YScaleType>(
  scale: Scale,
  params: Aspect['params'],
  format: Aspect['format'],
  isCategoryAxis: boolean
): ScaleConfig<S> {
  const type = (
    isCategoryAxis
      ? getScaleType(
          scale,
          format?.id === 'number' ||
            (format?.params?.id === 'number' &&
              format?.id !== BUCKET_TYPES.RANGE &&
              format?.id !== BUCKET_TYPES.TERMS),
          'date' in params,
          'interval' in params
        )
      : getScaleType(scale, true)
  ) as S;

  return {
    ...scale,
    type,
  };
}

function getAxisStyle(
  isMultiLayerTimeAxis: boolean,
  darkMode: boolean,
  ticks?: TickOptions,
  title?: string,
  rotationFallback: LabelRotation = LabelRotation.Vertical
): AxisSpec['style'] {
  return isMultiLayerTimeAxis
    ? {
        ...MULTILAYER_TIME_AXIS_STYLE,
        tickLabel: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLabel,
          visible: Boolean(ticks?.show),
        },
        tickLine: {
          ...MULTILAYER_TIME_AXIS_STYLE.tickLine,
          visible: Boolean(ticks?.show),
        },
        axisTitle: {
          visible: (title ?? '').trim().length > 0,
        },
      }
    : {
        axisTitle: {
          visible: (title ?? '').trim().length > 0,
        },
        tickLabel: {
          visible: Boolean(ticks?.show),
          rotation: -(ticks?.rotation ?? rotationFallback),
        },
      };
}

function getAxisDomain<S extends XScaleType | YScaleType>(
  scale: ScaleConfig<S>,
  isCategoryAxis: boolean
): YDomainRange | undefined {
  if (isCategoryAxis || !scale) {
    return;
  }

  const { min, max, defaultYExtents, boundsMargin } = scale;
  const fit = defaultYExtents;
  const padding = boundsMargin || undefined;

  return { fit, padding, min: min ?? NaN, max: max ?? NaN };
}
