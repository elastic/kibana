/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { isNil } from 'lodash';

import {
  CustomTooltip,
  TooltipValue,
  TooltipValueFormatter,
  XYChartSeriesIdentifier,
} from '@elastic/charts';

import { BUCKET_TYPES } from '../../../data/public';

import { Aspects } from '../types';

import './_detailed_tooltip.scss';
import { fillEmptyValue } from '../utils/get_series_name_fn';
import { COMPLEX_SPLIT_ACCESSOR } from '../utils/accessors';

interface TooltipData {
  label: string;
  value: string;
}

const getTooltipData = (
  aspects: Aspects,
  header: TooltipValue | null,
  value: TooltipValue
): TooltipData[] => {
  const data: TooltipData[] = [];

  if (header) {
    const xFormatter =
      aspects.x.aggType === BUCKET_TYPES.DATE_RANGE || aspects.x.aggType === BUCKET_TYPES.RANGE
        ? null
        : aspects.x.formatter;
    data.push({
      label: aspects.x.title,
      value: xFormatter ? xFormatter(header.value) : `${header.value}`,
    });
  }

  const valueSeries = value.seriesIdentifier as XYChartSeriesIdentifier;
  const yAccessor = aspects.y.find(({ accessor }) => accessor === valueSeries.yAccessor) ?? null;

  if (yAccessor) {
    data.push({
      label: yAccessor.title,
      value: yAccessor.formatter ? yAccessor.formatter(value.value) : `${value.value}`,
    });
  }

  if (aspects.z && !isNil(value.markValue)) {
    data.push({
      label: aspects.z.title,
      value: aspects.z.formatter ? aspects.z.formatter(value.markValue) : `${value.markValue}`,
    });
  }

  valueSeries.splitAccessors.forEach((splitValue, key) => {
    const split = (aspects.series ?? []).find(({ accessor }, i) => {
      return accessor === key || key === `${COMPLEX_SPLIT_ACCESSOR}::${i}`;
    });

    if (split) {
      data.push({
        label: split?.title,
        value:
          split?.formatter && !key.toString().startsWith(COMPLEX_SPLIT_ACCESSOR)
            ? split?.formatter(splitValue)
            : `${splitValue}`,
      });
    }
  });

  return data;
};

const renderData = ({ label, value: rawValue }: TooltipData, index: number) => {
  const value = fillEmptyValue(rawValue);
  return label && value ? (
    <tr key={label + value + index}>
      <td className="detailedTooltip__label">
        <div className="detailedTooltip__labelContainer">{label}</div>
      </td>

      <td className="detailedTooltip__value">
        <div className="detailedTooltip__valueContainer">{value}</div>
      </td>
    </tr>
  ) : null;
};

export const getDetailedTooltip = (aspects: Aspects) => (
  headerFormatter?: TooltipValueFormatter
): CustomTooltip => {
  return function DetailedTooltip({ header, values }) {
    // Note: first value is not necessarily the closest value
    // To be fixed with https://github.com/elastic/elastic-charts/issues/835
    // TODO: Allow multiple values to be displayed in tooltip
    const highlightedValue = values.find(({ isHighlighted }) => isHighlighted);

    if (!highlightedValue) {
      return null;
    }

    const tooltipData = getTooltipData(aspects, header, highlightedValue);

    if (tooltipData.length === 0) {
      return null;
    }

    return (
      <div className="detailedTooltip">
        {headerFormatter && header && (
          <div className="detailedTooltip__header">{headerFormatter(header)}</div>
        )}
        <table>
          <tbody>{tooltipData.map(renderData)}</tbody>
        </table>
      </div>
    );
  };
};
