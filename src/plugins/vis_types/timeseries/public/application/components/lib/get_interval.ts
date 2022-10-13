/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { search } from '@kbn/data-plugin/public';
import { GTE_INTERVAL_RE } from '../../../../common/interval_regexp';
import { AUTO_INTERVAL } from '../../../../common/constants';
import { isVisTableData } from '../../../../common/vis_data_utils';
import type { PanelData, TimeseriesVisData } from '../../../../common/types';
import { TimeseriesVisParams } from '../../../types';

const { parseEsInterval } = search.aggs;

export const unitLookup = {
  s: i18n.translate('visTypeTimeseries.getInterval.secondsLabel', { defaultMessage: 'seconds' }),
  m: i18n.translate('visTypeTimeseries.getInterval.minutesLabel', { defaultMessage: 'minutes' }),
  h: i18n.translate('visTypeTimeseries.getInterval.hoursLabel', { defaultMessage: 'hours' }),
  d: i18n.translate('visTypeTimeseries.getInterval.daysLabel', { defaultMessage: 'days' }),
  w: i18n.translate('visTypeTimeseries.getInterval.weeksLabel', { defaultMessage: 'weeks' }),
  M: i18n.translate('visTypeTimeseries.getInterval.monthsLabel', { defaultMessage: 'months' }),
  y: i18n.translate('visTypeTimeseries.getInterval.yearsLabel', { defaultMessage: 'years' }),
};

type TimeUnit = keyof typeof unitLookup;

export const convertIntervalIntoUnit = (interval: number, hasTranslateUnitString = true) => {
  // Iterate units from biggest to smallest
  const units = Object.keys(unitLookup).reverse() as TimeUnit[];
  const duration = moment.duration(interval, 'ms');

  for (let i = 0; i < units.length; i++) {
    const as = duration.as(units[i]);

    if (Math.abs(as) > 1) {
      return {
        unitValue: Math.round(Math.abs(as)),
        unitString: hasTranslateUnitString ? unitLookup[units[i]] : units[i],
      };
    }
  }
};

export const isGteInterval = (interval: string) => GTE_INTERVAL_RE.test(interval);
export const isAutoInterval = (interval: string) => !interval || interval === AUTO_INTERVAL;

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const validateReInterval = (intervalValue: string) => {
  const validationResult = {} as ValidationResult;

  try {
    parseEsInterval(intervalValue);
  } catch ({ message }) {
    validationResult.errorMessage = message;
  } finally {
    validationResult.isValid = !validationResult.errorMessage;
  }

  return validationResult;
};

export const getInterval = (visData: TimeseriesVisData, model: TimeseriesVisParams) => {
  const series = get(
    visData,
    isVisTableData(visData) ? `series[0].series` : `${model.id}.series`,
    []
  ) as PanelData[];

  return series.reduce((currentInterval, item) => {
    if (
      item.data.length > 1 &&
      typeof item.data[1][0] === 'number' &&
      typeof item.data[0][0] === 'number'
    ) {
      const seriesInterval = item.data[1][0] - item.data[0][0];
      if (!currentInterval || seriesInterval < currentInterval) return seriesInterval;
    }
    return currentInterval;
  }, 0);
};
