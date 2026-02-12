/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';

interface Field {
  name: string;
  type: string;
}

type TimeUnit = 's' | 'm' | 'h' | 'd';

export const TIME_UNITS: Record<TimeUnit, string> = {
  s: i18n.translate('xpack.esqlRuleForm.timeUnits.seconds', {
    defaultMessage: 'seconds',
  }),
  m: i18n.translate('xpack.esqlRuleForm.timeUnits.minutes', {
    defaultMessage: 'minutes',
  }),
  h: i18n.translate('xpack.esqlRuleForm.timeUnits.hours', {
    defaultMessage: 'hours',
  }),
  d: i18n.translate('xpack.esqlRuleForm.timeUnits.days', {
    defaultMessage: 'days',
  }),
};

export const getTimeOptions = (val: number = 1) =>
  (Object.keys(TIME_UNITS) as TimeUnit[]).map((value) => ({
    value,
    text: val > 1 ? TIME_UNITS[value] : TIME_UNITS[value].slice(0, -1),
  }));

export const getTimeFieldOptions = (fields: Field[]): Array<{ text: string; value: string }> => {
  const options: Array<{ text: string; value: string }> = [];
  fields.forEach((field) => {
    if (field.type === 'date' || field.type === 'date_nanos') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};

export const getFields = async (http: HttpStart, indexes: string[]): Promise<Field[]> => {
  const { fields } = await http.post<{ fields: Field[] }>(
    `/internal/triggers_actions_ui/data/_fields`,
    {
      body: JSON.stringify({ indexPatterns: indexes }),
    }
  );
  return fields;
};

export const firstFieldOption = {
  text: i18n.translate('xpack.esqlRuleForm.timeField.selectPlaceholder', {
    defaultMessage: 'Select a field',
  }),
  value: '',
};

export const parseDuration = (duration: string): number => {
  const durationRegex = /^(\d+)(s|m|h|d)$/;
  const match = duration.match(durationRegex);
  if (!match) {
    throw new Error('Invalid duration format');
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid duration unit');
  }
};

export const formatDuration = (duration: number, short: boolean = false): string => {
  if (duration % (24 * 60 * 60 * 1000) === 0) {
    const days = duration / (24 * 60 * 60 * 1000);
    return short ? `${days}d` : `${days} day${days > 1 ? 's' : ''}`;
  }
  if (duration % (60 * 60 * 1000) === 0) {
    const hours = duration / (60 * 60 * 1000);
    return short ? `${hours}h` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (duration % (60 * 1000) === 0) {
    const minutes = duration / (60 * 1000);
    return short ? `${minutes}m` : `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  const seconds = duration / 1000;
  return short ? `${seconds}s` : `${seconds} second${seconds > 1 ? 's' : ''}`;
};

export const getDurationUnitValue = (duration: string): TimeUnit => {
  const durationRegex = /^(\d+)(s|m|h|d)$/;
  const match = duration.match(durationRegex);
  if (!match) {
    return 'm';
  }
  return match[2] as TimeUnit;
};

export const getDurationNumberInItsUnit = (duration: string): number => {
  const durationRegex = /^(\d+)(s|m|h|d)$/;
  const match = duration.match(durationRegex);
  if (!match) {
    return 1;
  }
  return parseInt(match[1], 10);
};
