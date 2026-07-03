/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUndefined, uniq, find } from 'lodash';
import React from 'react';
import moment from 'moment';
import type { Unit } from '@kbn/datemath';
import dateMath from '@kbn/datemath';
import { Endzones, getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import { getAccessorByDimension, getColumnByAccessor } from '@kbn/chart-expressions-common';
import type { AxisExtentConfigResult, CommonXYDataLayerConfig } from '../../common';

export interface XDomain {
  min?: number;
  max?: number;
  minInterval?: number;
}

const getDateHistogramMeta = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[]
) => {
  return layers
    .map(({ xAccessor, table }) => {
      const xColumn = xAccessor ? getColumnByAccessor(xAccessor, table.columns) : null;
      const meta = xColumn && datatableUtilitites.getDateHistogramMeta(xColumn);
      return meta ? { meta, field: xColumn?.meta.field } : undefined;
    })
    .find(Boolean);
};

const getAppliedTimeRange = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[]
) => {
  return layers
    .map(({ xAccessor, table }) => {
      const xColumn = xAccessor ? getColumnByAccessor(xAccessor, table.columns) : null;
      return xColumn ? datatableUtilitites.getColumnTimeRange(xColumn) : undefined;
    })
    .find(Boolean);
};

const getComputedDomain = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[]
): { min: number; max: number } | undefined => {
  const domains: { min: number; max: number }[] = [];
  for (const { xAccessor, table } of layers) {
    const xColumn = xAccessor ? getColumnByAccessor(xAccessor, table.columns) : null;
    const computedDomain = xColumn
      ? datatableUtilitites.getDateHistogramMeta(xColumn)?.domain
      : undefined;
    if (computedDomain) {
      domains.push(computedDomain);
    }
  }

  if (domains.length === 0) {
    return undefined;
  }

  return {
    min: Math.min(...domains.map(({ min }) => min)),
    max: Math.max(...domains.map(({ max }) => max)),
  };
};

const CALENDAR_UNITS: readonly Unit[] = ['d', 'w', 'M', 'y'];

const getXValues = (layers: CommonXYDataLayerConfig[]) => {
  return uniq(
    layers
      .flatMap<number>(({ table, xAccessor }) => {
        const accessor = xAccessor ? getAccessorByDimension(xAccessor, table.columns) : undefined;
        return table.rows.map((row) => accessor && row[accessor] && row[accessor].valueOf());
      })
      .filter((v) => !isUndefined(v))
      .sort((a, b) => a - b)
  );
};

export const getXDomain = (
  datatableUtilitites: DatatableUtilitiesService,
  layers: CommonXYDataLayerConfig[],
  minInterval: number | undefined,
  isTimeVis: boolean,
  isHistogram: boolean,
  hasBars: boolean,
  timeZone: string,
  xExtent?: AxisExtentConfigResult
) => {
  if (!isTimeVis) {
    const baseDomain = isHistogram ? { minInterval, min: NaN, max: NaN } : undefined;

    if (isFullyQualified(baseDomain)) {
      if (xExtent) {
        return {
          baseDomain,
          extendedDomain: {
            min: xExtent.lowerBound ?? NaN,
            max: xExtent.upperBound ?? NaN,
            minInterval: baseDomain.minInterval,
          },
        };
      }

      const xValues = getXValues(layers);
      const domainMin = Math.min(xValues[0], baseDomain.min);
      const domainMax = Math.max(xValues[xValues.length - 1], baseDomain.max);
      return {
        baseDomain,
        extendedDomain: {
          min: domainMin,
          max: domainMax,
          minInterval: baseDomain.minInterval,
        },
      };
    } else {
      return {
        baseDomain,
        extendedDomain: baseDomain,
      };
    }
  }

  const dateHistogram = getDateHistogramMeta(datatableUtilitites, layers);

  const from = dateHistogram?.meta?.timeRange?.from;
  const to = dateHistogram?.meta?.timeRange?.to;

  const baseDomain = {
    min: from ? moment(from).valueOf() : NaN,
    max: to ? moment(to).valueOf() : NaN,
    minInterval,
  };

  if (!isFullyQualified(baseDomain)) {
    const appliedTimeRange = getAppliedTimeRange(datatableUtilitites, layers);
    if (appliedTimeRange?.from && appliedTimeRange?.to) {
      const clampedDomain = {
        min: moment(appliedTimeRange.from).valueOf(),
        max: moment(appliedTimeRange.to).valueOf(),
        minInterval,
      };
      return {
        extendedDomain: clampedDomain,
        baseDomain: clampedDomain,
      };
    }

    return {
      extendedDomain: baseDomain,
      baseDomain,
    };
  }

  const xValues = getXValues(layers);

  // The domain extent (min/max) comes from the precomputed domain from ES|QL and directly from the data for DSL/agg
  // responses (which already contain the full grid via extended_bounds + min_doc_count: 0).
  const computedDomain = getComputedDomain(datatableUtilitites, layers);
  const domainMin = computedDomain ? computedDomain.min : Math.min(xValues[0], baseDomain.min);
  const domainMaxValue = computedDomain
    ? computedDomain.max
    : Math.max(baseDomain.max - baseDomain.minInterval, xValues[xValues.length - 1]);
  const domainMax = hasBars ? domainMaxValue : domainMaxValue + baseDomain.minInterval;

  const duration = moment.duration(baseDomain.minInterval);
  const unit = find(dateMath.units, (u) => Number.isInteger(duration.as(u))) as Unit;
  const minIntervalForDomain =
    xValues.length && CALENDAR_UNITS.includes(unit)
      ? getAdjustedInterval(xValues, duration.as(unit), unit, timeZone)
      : baseDomain.minInterval;

  return {
    extendedDomain: {
      min: domainMin,
      max: domainMax,
      minInterval: minIntervalForDomain,
    },
    baseDomain,
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
