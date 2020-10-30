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
} from '../types';
import { LabelRotation } from '../../../charts/public';

export function getAxis<S extends XScaleType | YScaleType>(
  { type, title: axisTitle, labels, scale: axisScale, ...axis }: CategoryAxis,
  { categoryLines, valueAxis }: Grid,
  { params, formatter, title: fallbackTitle = '', aggType }: Aspect,
  isDateHistogram = false
): AxisConfig<S> {
  const isCategoryAxis = type === AxisType.Category;
  const groupId = isCategoryAxis ? axis.id : undefined;
  const grid = isCategoryAxis
    ? {
        show: categoryLines,
      }
    : {
        show: valueAxis === axis.id,
      };
  // Date range formatter applied on xAccessor
  const tickFormatter = aggType === 'date_range' ? identity : formatter;
  const ticks: TickOptions = {
    formatter: tickFormatter,
    labelFormatter: getLabelFormatter(labels.truncate, tickFormatter),
    show: labels.show,
    rotation: labels.rotate,
    showOverlappingLabels: !labels.filter,
    showDuplicates: !labels.filter,
  };
  const scale = getScale<S>(axisScale, params, isCategoryAxis);
  const title = axisTitle.text || fallbackTitle;
  const falbackRotation =
    isCategoryAxis && isDateHistogram ? LabelRotation.Horizontal : LabelRotation.Vertical;

  return {
    ...axis,
    groupId,
    title,
    ticks,
    grid,
    scale,
    style: getAxisStyle(ticks, title, falbackRotation),
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

function getScaleType(scale?: Scale, isTime = false, isHistogram = false): ECScaleType | undefined {
  if (isTime) return 'time';
  if (isHistogram) return 'linear';

  const type = scale?.type;
  if (type === ScaleType.SquareRoot) {
    return ECScaleType.Sqrt;
  }

  return type ? type : undefined;
}

function getScale<S extends XScaleType | YScaleType>(
  scale: Scale,
  params: Aspect['params'],
  isCategoryAxis: boolean
): ScaleConfig<S> {
  const type = (isCategoryAxis
    ? getScaleType(scale, 'date' in params, 'interval' in params)
    : getScaleType(scale)) as S;

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
