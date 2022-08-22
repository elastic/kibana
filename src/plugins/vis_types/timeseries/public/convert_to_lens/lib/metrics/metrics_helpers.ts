/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { utc } from 'moment';
import { search } from '@kbn/data-plugin/public';
import dateMath from '@kbn/datemath';
import { TimeRange, UI_SETTINGS } from '@kbn/data-plugin/common';
import { getUISettings } from '../../../services';
import type { Metric } from '../../../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';
import { getFilterRatioFormula } from './filter_ratio_formula';
import { getParentPipelineSeriesFormula } from './parent_pipeline_formula';
import { getSiblingPipelineSeriesFormula } from './sibling_pipeline_formula';

export const getPercentilesSeries = (
  percentiles: Metric['percentiles'],
  splitMode: string,
  layerColor: string,
  fieldName?: string
) => {
  return percentiles?.map((percentile) => {
    return {
      agg: 'percentile',
      isFullReference: false,
      color: splitMode === 'everything' ? percentile.color : layerColor,
      fieldName: fieldName ?? 'document',
      params: { percentile: percentile.value },
    };
  });
};

export const getPercentileRankSeries = (
  values: Metric['values'],
  colors: Metric['colors'],
  splitMode: string,
  layerColor: string,
  fieldName?: string
) => {
  return values?.map((value, index) => {
    return {
      agg: 'percentile_rank',
      isFullReference: false,
      color: splitMode === 'everything' ? colors?.[index] : layerColor,
      fieldName: fieldName ?? 'document',
      params: { value },
    };
  });
};

export const getWindow = (interval?: string, timeRange?: TimeRange) => {
  let window = interval || '1h';

  if (timeRange && !interval) {
    const { from, to } = timeRange;
    const timerange = utc(to).valueOf() - utc(from).valueOf();
    const maxBars = getUISettings().get<number>(UI_SETTINGS.HISTOGRAM_BAR_TARGET);

    const duration = search.aggs.calcAutoIntervalLessThan(maxBars, timerange);
    const unit =
      dateMath.units.find((u) => {
        const value = duration.as(u);
        return Number.isInteger(value);
      }) || 'ms';

    window = `${duration.as(unit)}${unit}`;
  }

  return window;
};

export const getTimeScale = (metric: Metric) => {
  const supportedTimeScales = ['1s', '1m', '1h', '1d'];
  let timeScale;
  if (metric.unit && supportedTimeScales.includes(metric.unit)) {
    timeScale = metric.unit.replace('1', '');
  }
  return timeScale;
};

export const getFormulaSeries = (script: string) => {
  return [
    {
      agg: 'formula',
      isFullReference: true,
      fieldName: 'document',
      params: { formula: script },
    },
  ];
};

export const addTimeRangeToFormula = (window?: string) => {
  return window ? `, timeRange='${window}'` : '';
};

export const getPipelineAgg = (subFunctionMetric: Metric) => {
  const pipelineAggMap = SUPPORTED_METRICS[subFunctionMetric.type];
  if (!pipelineAggMap) {
    return null;
  }
  return pipelineAggMap.name;
};

export const getFormulaEquivalent = (
  currentMetric: Metric,
  metrics: Metric[],
  metaValue?: number,
  window?: string
) => {
  const aggregation = SUPPORTED_METRICS[currentMetric.type]?.name;
  switch (currentMetric.type) {
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket':
    case 'positive_only': {
      return getSiblingPipelineSeriesFormula(currentMetric.type, currentMetric, metrics, window);
    }
    case 'count': {
      return `${aggregation}()`;
    }
    case 'percentile': {
      return `${aggregation}(${currentMetric.field}${
        metaValue ? `, percentile=${metaValue}` : ''
      }${addTimeRangeToFormula(window)})`;
    }
    case 'percentile_rank': {
      return `${aggregation}(${currentMetric.field}${
        metaValue ? `, value=${metaValue}` : ''
      }${addTimeRangeToFormula(window)})`;
    }
    case 'cumulative_sum':
    case 'derivative':
    case 'moving_average': {
      const [fieldId, _] = currentMetric?.field?.split('[') ?? [];
      const subFunctionMetric = metrics.find((metric) => metric.id === fieldId);
      if (!subFunctionMetric) {
        return null;
      }
      const pipelineAgg = getPipelineAgg(subFunctionMetric);
      if (!pipelineAgg) {
        return null;
      }
      return getParentPipelineSeriesFormula(
        metrics,
        subFunctionMetric,
        pipelineAgg,
        currentMetric.type,
        metaValue,
        window
      );
    }
    case 'positive_rate': {
      return `${aggregation}(max(${currentMetric.field}${addTimeRangeToFormula(window)}))`;
    }
    case 'filter_ratio': {
      return getFilterRatioFormula(currentMetric, window);
    }
    case 'static': {
      return `${currentMetric.value}`;
    }
    case 'std_deviation': {
      if (currentMetric.mode === 'lower') {
        return `average(${currentMetric.field}${addTimeRangeToFormula(window)}) - ${
          currentMetric.sigma || 1.5
        } * ${aggregation}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
      }
      if (currentMetric.mode === 'upper') {
        return `average(${currentMetric.field}${addTimeRangeToFormula(window)}) + ${
          currentMetric.sigma || 1.5
        } * ${aggregation}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
      }
      return `${aggregation}(${currentMetric.field})`;
    }
    default: {
      return `${aggregation}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
    }
  }
};
