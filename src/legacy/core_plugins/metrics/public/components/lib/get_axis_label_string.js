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

import { relativeOptions } from '../../../../../../ui/public/timepicker/relative_options';
import _ from 'lodash';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

const unitLookup = {
  s: i18n.translate('tsvb.axisLabelOptions.secondsLabel', { defaultMessage: 'seconds' }),
  m: i18n.translate('tsvb.axisLabelOptions.minutesLabel', { defaultMessage: 'minutes' }),
  h: i18n.translate('tsvb.axisLabelOptions.hoursLabel', { defaultMessage: 'hours' }),
  d: i18n.translate('tsvb.axisLabelOptions.daysLabel', { defaultMessage: 'days' }),
  w: i18n.translate('tsvb.axisLabelOptions.weeksLabel', { defaultMessage: 'weeks' }),
  M: i18n.translate('tsvb.axisLabelOptions.monthsLabel', { defaultMessage: 'months' }),
  y: i18n.translate('tsvb.axisLabelOptions.yearsLabel', { defaultMessage: 'years' })
};
export function getAxisLabelString(interval) {
  const units = _.pluck(_.clone(relativeOptions).reverse(), 'value')
    .filter(s => /^[smhdwMy]$/.test(s));
  const duration = moment.duration(interval, 'ms');
  for (let i = 0; i < units.length; i++) {
    const as = duration.as(units[i]);
    if (Math.abs(as) > 1) {
      const unitValue = Math.round(Math.abs(as));
      const unitString = unitLookup[units[i]];
      return i18n.translate('tsvb.axisLabelOptions.axisLabel',
        { defaultMessage: 'per {unitValue} {unitString}', values: { unitValue, unitString } });
    }
  }
}
