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
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { search } from '../../../../../../plugins/data/public';
const { parseEsInterval } = search.aggs;
import { GTE_INTERVAL_RE } from '../../../../../../plugins/vis_type_timeseries/common/interval_regexp';

export const AUTO_INTERVAL = 'auto';

export const unitLookup = {
  s: i18n.translate('visTypeTimeseries.getInterval.secondsLabel', { defaultMessage: 'seconds' }),
  m: i18n.translate('visTypeTimeseries.getInterval.minutesLabel', { defaultMessage: 'minutes' }),
  h: i18n.translate('visTypeTimeseries.getInterval.hoursLabel', { defaultMessage: 'hours' }),
  d: i18n.translate('visTypeTimeseries.getInterval.daysLabel', { defaultMessage: 'days' }),
  w: i18n.translate('visTypeTimeseries.getInterval.weeksLabel', { defaultMessage: 'weeks' }),
  M: i18n.translate('visTypeTimeseries.getInterval.monthsLabel', { defaultMessage: 'months' }),
  y: i18n.translate('visTypeTimeseries.getInterval.yearsLabel', { defaultMessage: 'years' }),
};

export const convertIntervalIntoUnit = (interval, hasTranslateUnitString = true) => {
  // Iterate units from biggest to smallest
  const units = Object.keys(unitLookup).reverse();
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

export const isGteInterval = (interval) => GTE_INTERVAL_RE.test(interval);
export const isAutoInterval = (interval) => !interval || interval === AUTO_INTERVAL;

export const validateReInterval = (intervalValue) => {
  const validationResult = {};

  try {
    parseEsInterval(intervalValue);
  } catch ({ message }) {
    validationResult.errorMessage = message;
  } finally {
    validationResult.isValid = !validationResult.errorMessage;
  }

  return validationResult;
};

export const getInterval = (visData, model) => {
  let series;

  if (model && model.type === 'table') {
    series = get(visData, `series[0].series`, []);
  } else {
    series = get(visData, `${model.id}.series`, []);
  }

  return series.reduce((currentInterval, item) => {
    if (item.data.length > 1) {
      const seriesInterval = item.data[1][0] - item.data[0][0];
      if (!currentInterval || seriesInterval < currentInterval) return seriesInterval;
    }
    return currentInterval;
  }, 0);
};
