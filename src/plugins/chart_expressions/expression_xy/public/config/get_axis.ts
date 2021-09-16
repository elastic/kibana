/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNil } from 'lodash';
import { AxisSpec, TickFormatter, YDomainRange, ScaleType as ECScaleType } from '@elastic/charts';
import { LabelRotation } from '../../../../charts/public';
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
  ChartType,
} from '../../common/types';
import { isSimpleField } from '../../common/utils/accessors';

export function getAxis<S extends XScaleType | YScaleType>(
  { type, title: axisTitle, labels, scale: axisScale, ...axis }: CategoryAxis,
  { categoryLines, valueAxis }: Grid,
  { params, format, formatter, title: fallbackTitle = '', accessor }: Aspect,
  seriesParams: SeriesParam[],
  isDateHistogram = false,
  shouldApplyFormatter = false
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

  const tickFormatter = (v: any) =>
    isSimpleField(format) || shouldApplyFormatter ? formatter?.(v) ?? v : v;

  const ticks: TickOptions = {
    formatter: tickFormatter,
    labelFormatter: getLabelFormatter(labels.truncate, tickFormatter),
    show: labels.show,
    rotation: labels.rotate,
    showOverlappingLabels: !labels.filter,
    showDuplicates: !labels.filter,
  };

  const isHistogram = seriesParams.filter((sp) => sp.type === ChartType.Histogram).length > 0;

  const scale = getScale<S>(axisScale, params, format, isCategoryAxis, isHistogram);

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
    style: getAxisStyle(ticks, title, fallbackRotation),
    domain: getAxisDomain(scale, isCategoryAxis),
    integersOnly: params?.integersOnly ?? false,
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

function getScale<S extends XScaleType | YScaleType>(
  scale: Scale,
  params: Aspect['params'],
  format: Aspect['format'],
  isCategoryAxis: boolean,
  isHistogram: boolean = false
): ScaleConfig<S> {
  const type = (isCategoryAxis
    ? getScaleType(
        scale,
        format?.id === 'number' || (format?.params?.id === 'number' && format?.id !== 'range'),
        'date' in params,
        isHistogram
      )
    : getScaleType(scale, true)) as S;

  return {
    ...scale,
    type,
  };
}

function getAxisStyle(
  ticks?: TickOptions,
  title?: string,
  rotationFallback: LabelRotation = LabelRotation.Vertical
): AxisSpec['style'] {
  return {
    axisTitle: {
      visible: (title ?? '').trim().length > 0,
    },
    tickLabel: {
      visible: ticks?.show,
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

  if (!isNil(min) && !isNil(max)) {
    return { fit, padding, min, max };
  }

  if (!isNil(min)) {
    return { fit, padding, min };
  }

  if (!isNil(max)) {
    return { fit, padding, max };
  }

  return { fit, padding };
}
