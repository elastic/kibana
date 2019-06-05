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
import { pluck, get, clone, isString } from 'lodash';
import { relativeOptions } from '../../../../../ui/public/timepicker/relative_options';

import { GTE_INTERVAL_RE, INTERVAL_STRING_RE } from '../../../common/interval_regexp';

export const AUTO_INTERVAL = 'auto';

export const unitLookup = {
  s: i18n.translate('tsvb.getInterval.secondsLabel', { defaultMessage: 'seconds' }),
  m: i18n.translate('tsvb.getInterval.minutesLabel', { defaultMessage: 'minutes' }),
  h: i18n.translate('tsvb.getInterval.hoursLabel', { defaultMessage: 'hours' }),
  d: i18n.translate('tsvb.getInterval.daysLabel', { defaultMessage: 'days' }),
  w: i18n.translate('tsvb.getInterval.weeksLabel', { defaultMessage: 'weeks' }),
  M: i18n.translate('tsvb.getInterval.monthsLabel', { defaultMessage: 'months' }),
  y: i18n.translate('tsvb.getInterval.yearsLabel', { defaultMessage: 'years' }),
};

export const convertIntervalIntoUnit = (interval, hasTranslateUnitString = true) => {
  const units = pluck(clone(relativeOptions).reverse(), 'value').filter(s => /^[smhdwMy]$/.test(s));
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
export const isGteInterval = interval => GTE_INTERVAL_RE.test(interval);

export const isIntervalValid = interval => {
  return (
    isString(interval) &&
    (interval === AUTO_INTERVAL || INTERVAL_STRING_RE.test(interval) || isGteInterval(interval))
  );
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
