/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isUndefined, uniq, find } from 'lodash';
import React from 'react';
import moment from 'moment';
import dateMath, { Unit } from '@kbn/datemath';
import { Endzones, getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import type { AxisExtentConfigResult, CommonXYDataLayerConfig } from '../../common';

export interface XDomain {
  min?: number;
  max?: number;
  minInterval?: number;
}

export const getAppliedTimeRange = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[]
) => {
  return layers
    .map(({ xAccessor, table }) => {
      const xColumn = xAccessor ? getColumnByAccessor(xAccessor, table.columns) : null;
      const timeRange = xColumn && datatableUtilitites.getDateHistogramMeta(xColumn)?.timeRange;
      if (timeRange) {
        return {
          timeRange,
          field: xColumn?.meta.field,
        };
      }
    })
    .find(Boolean);
};

export const getXDomain = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[],
  minInterval: number | undefined,
  isTimeViz: boolean,
  isHistogram: boolean,
  hasBars: boolean,
  timeZone: string,
  xExtent?: AxisExtentConfigResult
) => {
  const appliedTimeRange = getAppliedTimeRange(datatableUtilitites, layers)?.timeRange;
  const from = appliedTimeRange?.from;
  const to = appliedTimeRange?.to;
  const baseDomain = isTimeViz
    ? {
        min: from ? moment(from).valueOf() : NaN,
        max: to ? moment(to).valueOf() : NaN,
        minInterval,
      }
    : isHistogram
    ? { minInterval, min: NaN, max: NaN }
    : undefined;

  if ((isHistogram || isTimeViz) && isFullyQualified(baseDomain)) {
    if (xExtent && !isTimeViz) {
      return {
        extendedDomain: {
          min: xExtent.lowerBound ?? NaN,
          max: xExtent.upperBound ?? NaN,
          minInterval: baseDomain.minInterval,
        },
        baseDomain,
      };
    }
    const xValues = uniq(
      layers
        .flatMap<number>(({ table, xAccessor }) => {
          const accessor =
            xAccessor !== undefined ? getAccessorByDimension(xAccessor, table.columns) : undefined;
          return table.rows.map((row) => accessor && row[accessor] && row[accessor].valueOf());
        })
        .filter((v) => !isUndefined(v))
        .sort()
    );
    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, baseDomain.min);
    const domainMaxValue = Math.max(baseDomain.max - baseDomain.minInterval, lastXValue);
    const domainMax = hasBars ? domainMaxValue : domainMaxValue + baseDomain.minInterval;

    const duration = moment.duration(baseDomain.minInterval);
    const selectedUnit = find(dateMath.units, (u) => {
      const value = duration.as(u);
      return Number.isInteger(value);
    }) as Unit;

    return {
      extendedDomain: {
        min: domainMin,
        max: domainMax,
        minInterval: getAdjustedInterval(
          xValues,
          duration.as(selectedUnit),
          selectedUnit,
          timeZone
        ),
      },
      baseDomain,
    };
  }

  return {
    baseDomain,
    extendedDomain: baseDomain,
  };
};

function isFullyQualified(
  xDomain: XDomain | undefined
): xDomain is { min: number; max: number; minInterval: number } {
  return Boolean(
    xDomain &&
      typeof xDomain.min === 'number' &&
      typeof xDomain.max === 'number' &&
      xDomain.minInterval
  );
}

export const XyEndzones = function ({
  baseDomain,
  extendedDomain,
  histogramMode,
  darkMode,
}: {
  baseDomain?: XDomain;
  extendedDomain?: XDomain;
  histogramMode: boolean;
  darkMode: boolean;
}) {
  return isFullyQualified(baseDomain) && isFullyQualified(extendedDomain) ? (
    <Endzones
      isFullBin={!histogramMode}
      isDarkMode={darkMode}
      domainStart={baseDomain.min}
      domainEnd={baseDomain.max}
      interval={extendedDomain.minInterval}
      domainMin={extendedDomain.min}
      domainMax={extendedDomain.max}
      hideTooltips={false}
    />
  ) : null;
};
