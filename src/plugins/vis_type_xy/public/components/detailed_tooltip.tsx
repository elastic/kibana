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

import React from 'react';
import { isNil } from 'lodash';

import {
  CustomTooltip,
  TooltipValue,
  TooltipValueFormatter,
  XYChartSeriesIdentifier,
} from '@elastic/charts';

import { Aspects } from '../types';

import './_detailed_tooltip.scss';

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
    data.push({
      label: aspects.x.title,
      value: aspects.x.formatter ? aspects.x.formatter(header.value) : `${header.value}`,
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
    const split = (aspects.series ?? []).find(({ accessor }) => accessor === key);

    if (split) {
      data.push({
        label: split?.title,
        value: split?.formatter ? split?.formatter(splitValue) : `${splitValue}`,
      });
    }
  });

  return data;
};

const renderData = ({ label, value }: TooltipData, index: number) =>
  label && value ? (
    <tr key={label + value + index}>
      <td className="detailedTooltip__label">
        <div className="detailedTooltip__labelContainer">{label}</div>
      </td>

      <td className="detailedTooltip__value">
        <div className="detailedTooltip__valueContainer">{value}</div>
      </td>
    </tr>
  ) : null;

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
