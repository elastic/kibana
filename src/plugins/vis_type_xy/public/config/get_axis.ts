/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { identity, isNil } from 'lodash';

import { AxisSpec, TickFormatter, YDomainRange, ScaleType as ECScaleType } from '@elastic/charts';

import { LabelRotation } from '../../../charts/public';
import { BUCKET_TYPES } from '../../../data/public';

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
  isDateHistogram = false
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
    style: getAxisStyle(ticks, title, fallbackRotation),
    domain: getAxisDomain(scale, isCategoryAxis),
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
    const formattedValue = formatter ? formatter(value) : value;

    if (formattedValue.length > truncate) {
      return `${formattedValue.slice(0, truncate)}...`;
    }

    return formattedValue;
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
  isCategoryAxis: boolean
): ScaleConfig<S> {
  const type = (isCategoryAxis
    ? getScaleType(
        scale,
        format?.id === 'number' || format?.params?.id === 'number',
        'date' in params,
        'interval' in params
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
  const padding = boundsMargin;

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
