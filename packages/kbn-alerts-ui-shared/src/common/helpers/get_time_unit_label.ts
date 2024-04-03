/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TIME_UNITS } from '../constants';

export function getTimeUnitLabel(timeUnit = TIME_UNITS.SECOND, timeValue = '0') {
  switch (timeUnit) {
    case TIME_UNITS.SECOND:
      return i18n.translate('alertsUIShared.timeUnits.secondLabel', {
        defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
        values: { timeValue },
      });
    case TIME_UNITS.MINUTE:
      return i18n.translate('alertsUIShared.timeUnits.minuteLabel', {
        defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
        values: { timeValue },
      });
    case TIME_UNITS.HOUR:
      return i18n.translate('alertsUIShared.timeUnits.hourLabel', {
        defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
        values: { timeValue },
      });
    case TIME_UNITS.DAY:
      return i18n.translate('alertsUIShared.timeUnits.dayLabel', {
        defaultMessage: '{timeValue, plural, one {day} other {days}}',
        values: { timeValue },
      });
  }
}
