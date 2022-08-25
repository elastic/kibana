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
import { TimeScaleUnit } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getUISettings } from '../../../services';
import type { Metric, MetricType, Panel, Series } from '../../../../common/types';
import { TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { getFilterRatioFormula } from './filter_ratio_formula';
import { getParentPipelineSeriesFormula } from './parent_pipeline_formula';
import { getSiblingPipelineSeriesFormula } from './sibling_pipeline_formula';
import { getFormulaFromMetric, SUPPORTED_METRICS } from './supported_metrics';

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

const shouldCalculateWindow = (timeRangeMode?: string) => {
  return timeRangeMode === TIME_RANGE_DATA_MODES.LAST_VALUE;
};

export const getWindow = (model: Panel, series: Series, timeRange?: TimeRange) => {
  if (
    !shouldCalculateWindow(
      series.override_index_pattern ? series.time_range_mode : model.time_range_mode
    )
  ) {
    return undefined;
  }
  const interval = series.override_index_pattern ? series.series_interval : model.interval;
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

export type TimeScaleValue = `1${TimeScaleUnit}`;

export const isTimeScaleValue = (unit: string): unit is TimeScaleValue => {
  const supportedTimeScales: TimeScaleValue[] = ['1s', '1m', '1h', '1d'];
  return supportedTimeScales.includes(unit as TimeScaleValue);
};

export const getTimeScale = (metric: Metric): TimeScaleUnit | undefined => {
  let timeScale: TimeScaleUnit | undefined;
  if (metric.unit && isTimeScaleValue(metric.unit)) {
    timeScale = metric.unit.replace('1', '') as TimeScaleUnit;
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

export const getPipelineAgg = (agg: MetricType) => {
  const pipelineAggMap = SUPPORTED_METRICS[agg];
  if (!pipelineAggMap) {
    return null;
  }
  return pipelineAggMap;
};

export const getFormulaEquivalent = (
  currentMetric: Metric,
  metrics: Metric[],
  metaValue?: number,
  window?: string
) => {
  const aggregation = SUPPORTED_METRICS[currentMetric.type];
  if (!aggregation) {
    return null;
  }

  const aggFormula = getFormulaFromMetric(aggregation);

  switch (currentMetric.type) {
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket':
    case 'positive_only': {
      return getSiblingPipelineSeriesFormula(currentMetric.type, currentMetric, metrics, window);
    }
    case 'count': {
      return `${aggFormula}()`;
    }
    case 'percentile': {
      return `${aggFormula}(${currentMetric.field}${
        metaValue ? `, percentile=${metaValue}` : ''
      }${addTimeRangeToFormula(window)})`;
    }
    case 'percentile_rank': {
      return `${aggFormula}(${currentMetric.field}${
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
      const pipelineAgg = getPipelineAgg(subFunctionMetric.type);
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
      return `${aggFormula}(max(${currentMetric.field}${addTimeRangeToFormula(window)}))`;
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
        } * ${aggFormula}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
      }
      if (currentMetric.mode === 'upper') {
        return `average(${currentMetric.field}${addTimeRangeToFormula(window)}) + ${
          currentMetric.sigma || 1.5
        } * ${aggFormula}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
      }
      return `${aggFormula}(${currentMetric.field})`;
    }
    default: {
      return `${aggFormula}(${currentMetric.field}${addTimeRangeToFormula(window)})`;
    }
  }
};
