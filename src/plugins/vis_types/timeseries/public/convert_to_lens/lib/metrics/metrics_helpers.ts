/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { utc } from 'moment';
import { search } from '@kbn/data-plugin/public';
import dateMath from '@kbn/datemath';
import { TimeRange, UI_SETTINGS } from '@kbn/data-plugin/common';
import { TimeScaleUnit } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { getUISettings } from '../../../services';
import type { Metric, Panel, Series } from '../../../../common/types';
import { TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { getFilterRatioFormula } from './filter_ratio_formula';
import { getFormulaFromMetric, SUPPORTED_METRICS } from './supported_metrics';
import { buildCounterRateFormula } from './counter_rate_formula';
import { getPipelineSeriesFormula } from './pipeline_formula';
import { AdditionalArgs } from '../../types';

const shouldCalculateReducedTimeRange = (timeRangeMode?: string) => {
  return timeRangeMode === TIME_RANGE_DATA_MODES.LAST_VALUE;
};

export const getReducedTimeRange = (model: Panel, series: Series, timeRange?: TimeRange) => {
  if (
    !shouldCalculateReducedTimeRange(
      series.override_index_pattern ? series.time_range_mode : model.time_range_mode
    )
  ) {
    return undefined;
  }
  const interval = series.override_index_pattern ? series.series_interval : model.interval;
  let reducedTimeRange = interval || '1h';

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

    reducedTimeRange = `${duration.as(unit)}${unit}`;
  }

  return reducedTimeRange;
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

const addTimeRangeToFormula = (reducedTimeRange?: string) => {
  return reducedTimeRange ? `, reducedTimeRange='${reducedTimeRange}'` : '';
};

const addTimeShiftToFormula = (timeShift?: string) => {
  return timeShift ? `, shift='${timeShift}'` : '';
};

export const addAdditionalArgs = ({ reducedTimeRange, timeShift }: AdditionalArgs) => {
  return `${addTimeShiftToFormula(timeShift)}${addTimeRangeToFormula(reducedTimeRange)}`;
};

export const getFormulaEquivalent = (
  currentMetric: Metric,
  metrics: Metric[],
  {
    metaValue,
    reducedTimeRange,
    timeShift,
  }: { metaValue?: number; reducedTimeRange?: string; timeShift?: string } = {}
): string | null => {
  const aggregation = SUPPORTED_METRICS[currentMetric.type];
  if (!aggregation) {
    return null;
  }

  const aggFormula = getFormulaFromMetric(aggregation);

  switch (currentMetric.type) {
    case 'cumulative_sum':
    case 'derivative':
    case 'moving_average':
    case 'avg_bucket':
    case 'max_bucket':
    case 'min_bucket':
    case 'sum_bucket':
    case 'positive_only': {
      const [subMetricId, nestedMetaValue] = currentMetric?.field?.split('[') ?? [];
      const subFunctionMetric = metrics.find((metric) => metric.id === subMetricId);
      if (!subFunctionMetric || !SUPPORTED_METRICS[subFunctionMetric.type]) {
        return null;
      }

      return getPipelineSeriesFormula(currentMetric, metrics, subFunctionMetric, {
        metaValue: nestedMetaValue ? Number(nestedMetaValue?.replace(']', '')) : undefined,
        reducedTimeRange,
        timeShift,
      });
    }
    case 'count': {
      return `${aggFormula}(${timeShift ? `shift='${timeShift}'` : ''}${
        timeShift && reducedTimeRange ? ', ' : ''
      }${reducedTimeRange ? `reducedTimeRange='${reducedTimeRange}'` : ''})`;
    }
    case 'percentile': {
      return `${aggFormula}(${currentMetric.field}${
        metaValue ? `, percentile=${metaValue}` : ''
      }${addAdditionalArgs({ reducedTimeRange, timeShift })})`;
    }
    case 'percentile_rank': {
      return `${aggFormula}(${currentMetric.field}${
        metaValue ? `, value=${metaValue}` : ''
      }${addAdditionalArgs({ reducedTimeRange, timeShift })})`;
    }
    case 'positive_rate': {
      const counterRateFormula = buildCounterRateFormula(aggFormula, currentMetric.field!, {
        reducedTimeRange,
        timeShift,
      });
      return currentMetric.unit
        ? `normalize_by_unit(${counterRateFormula}, unit='${getTimeScale(currentMetric)}')`
        : counterRateFormula;
    }
    case 'filter_ratio': {
      return getFilterRatioFormula(currentMetric, { reducedTimeRange, timeShift });
    }
    case 'static': {
      return `${currentMetric.value}`;
    }
    case 'variance': {
      return `${aggFormula}(standard_deviation(${currentMetric.field}${addAdditionalArgs({
        reducedTimeRange,
        timeShift,
      })}), 2)`;
    }
    case 'std_deviation': {
      if (currentMetric.mode === 'lower') {
        return `average(${currentMetric.field}${addAdditionalArgs({
          reducedTimeRange,
          timeShift,
        })}) - ${currentMetric.sigma || 1.5} * ${aggFormula}(${
          currentMetric.field
        }${addAdditionalArgs({ reducedTimeRange, timeShift })})`;
      }
      if (currentMetric.mode === 'upper') {
        return `average(${currentMetric.field}${addAdditionalArgs({
          reducedTimeRange,
          timeShift,
        })}) + ${currentMetric.sigma || 1.5} * ${aggFormula}(${
          currentMetric.field
        }${addAdditionalArgs({ reducedTimeRange, timeShift })})`;
      }
      return `${aggFormula}(${currentMetric.field})`;
    }
    default: {
      return `${aggFormula}(${currentMetric.field ?? ''}${addAdditionalArgs({
        reducedTimeRange,
        timeShift,
      })})`;
    }
  }
};
