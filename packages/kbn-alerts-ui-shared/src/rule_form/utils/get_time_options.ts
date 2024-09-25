/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export enum TIME_UNITS {
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'd',
}

export const getTimeUnitLabel = (timeUnit = TIME_UNITS.SECOND, timeValue = '0') => {
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
};

export const getTimeOptions = (unitSize: number) => {
  return Object.entries(TIME_UNITS).map(([_, value]) => {
    return {
      text: getTimeUnitLabel(value, unitSize.toString()),
      value,
    };
  });
};

interface TimeFieldOptions {
  text: string;
  value: string;
}

export const getTimeFieldOptions = (
  fields: Array<{ type: string; name: string }>
): TimeFieldOptions[] => {
  return fields.reduce<TimeFieldOptions[]>((result, field: { type: string; name: string }) => {
    if (field.type === 'date' || field.type === 'date_nanos') {
      result.push({
        text: field.name,
        value: field.name,
      });
    }
    return result;
  }, []);
};
