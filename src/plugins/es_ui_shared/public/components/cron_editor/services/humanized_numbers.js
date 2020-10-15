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

import { i18n } from '@kbn/i18n';

// The international ISO standard dictates Monday as the first day of the week, but cron patterns
// use Sunday as the first day, so we're going with the cron way.
const dayOrdinalToDayNameMap = {
  0: i18n.translate('esUi.cronEditor.day.sunday', { defaultMessage: 'Sunday' }),
  1: i18n.translate('esUi.cronEditor.day.monday', { defaultMessage: 'Monday' }),
  2: i18n.translate('esUi.cronEditor.day.tuesday', { defaultMessage: 'Tuesday' }),
  3: i18n.translate('esUi.cronEditor.day.wednesday', { defaultMessage: 'Wednesday' }),
  4: i18n.translate('esUi.cronEditor.day.thursday', { defaultMessage: 'Thursday' }),
  5: i18n.translate('esUi.cronEditor.day.friday', { defaultMessage: 'Friday' }),
  6: i18n.translate('esUi.cronEditor.day.saturday', { defaultMessage: 'Saturday' }),
};

const monthOrdinalToMonthNameMap = {
  0: i18n.translate('esUi.cronEditor.month.january', { defaultMessage: 'January' }),
  1: i18n.translate('esUi.cronEditor.month.february', { defaultMessage: 'February' }),
  2: i18n.translate('esUi.cronEditor.month.march', { defaultMessage: 'March' }),
  3: i18n.translate('esUi.cronEditor.month.april', { defaultMessage: 'April' }),
  4: i18n.translate('esUi.cronEditor.month.may', { defaultMessage: 'May' }),
  5: i18n.translate('esUi.cronEditor.month.june', { defaultMessage: 'June' }),
  6: i18n.translate('esUi.cronEditor.month.july', { defaultMessage: 'July' }),
  7: i18n.translate('esUi.cronEditor.month.august', { defaultMessage: 'August' }),
  8: i18n.translate('esUi.cronEditor.month.september', { defaultMessage: 'September' }),
  9: i18n.translate('esUi.cronEditor.month.october', { defaultMessage: 'October' }),
  10: i18n.translate('esUi.cronEditor.month.november', { defaultMessage: 'November' }),
  11: i18n.translate('esUi.cronEditor.month.december', { defaultMessage: 'December' }),
};

export function getOrdinalValue(number) {
  // TODO: This is breaking reporting pdf generation. Possibly due to phantom not setting locale,
  // which is needed by i18n (formatjs). Need to verify, fix, and restore i18n in place of static stings.
  // return i18n.translate('esUi.cronEditor.number.ordinal', {
  //   defaultMessage: '{number, selectordinal, one{#st} two{#nd} few{#rd} other{#th}}',
  //   values: { number },
  // });
  // TODO: https://github.com/elastic/kibana/issues/27136

  // Protects against falsey (including 0) values
  const num = number && number.toString();
  let lastDigit = num && num.substr(-1);
  let ordinal;

  if (!lastDigit) {
    return number;
  }
  lastDigit = parseFloat(lastDigit);

  switch (lastDigit) {
    case 1:
      ordinal = 'st';
      break;
    case 2:
      ordinal = 'nd';
      break;
    case 3:
      ordinal = 'rd';
      break;
    default:
      ordinal = 'th';
  }

  return `${num}${ordinal}`;
}

export function getDayName(dayOrdinal) {
  return dayOrdinalToDayNameMap[dayOrdinal];
}

export function getMonthName(monthOrdinal) {
  return monthOrdinalToMonthNameMap[monthOrdinal];
}
