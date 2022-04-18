/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import React from 'react';
import moment from 'moment';
import { Endzones } from '@kbn/charts-plugin/public';
import { search } from '@kbn/data-plugin/public';
import type { CommonXYDataLayerConfigResult } from '../../common';

export interface XDomain {
  min?: number;
  max?: number;
  minInterval?: number;
}

export const getAppliedTimeRange = (layers: CommonXYDataLayerConfigResult[]) => {
  return layers
    .map(({ xAccessor, table }) => {
      const xColumn = table.columns.find((col) => col.id === xAccessor);
      const timeRange =
        xColumn && search.aggs.getDateHistogramMetaDataByDatatableColumn(xColumn)?.timeRange;
      if (timeRange) {
        return {
          timeRange,
          field: xColumn.meta.field,
        };
      }
    })
    .find(Boolean);
};

export const getXDomain = (
  layers: CommonXYDataLayerConfigResult[],
  minInterval: number | undefined,
  isTimeViz: boolean,
  isHistogram: boolean
) => {
  const appliedTimeRange = getAppliedTimeRange(layers)?.timeRange;
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

  if (isHistogram && isFullyQualified(baseDomain)) {
    const xValues = uniq(
      layers
        .flatMap<number>(({ table, xAccessor }) =>
          table.rows.map((row) => row[xAccessor!].valueOf())
        )
        .sort()
    );

    const [firstXValue] = xValues;
    const lastXValue = xValues[xValues.length - 1];

    const domainMin = Math.min(firstXValue, baseDomain.min);
    const domainMaxValue = baseDomain.max - baseDomain.minInterval;
    const domainMax = Math.max(domainMaxValue, lastXValue);

    return {
      extendedDomain: {
        min: domainMin,
        max: domainMax,
        minInterval: baseDomain.minInterval,
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
