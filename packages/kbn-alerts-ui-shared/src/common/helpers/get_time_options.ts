/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getTimeUnitLabel } from './get_time_unit_label';
import { TIME_UNITS } from '../constants';

export const getTimeOptions = (unitSize: number) =>
  Object.entries(TIME_UNITS).map(([_key, value]) => {
    return {
      text: getTimeUnitLabel(value, unitSize.toString()),
      value,
    };
  });

interface TimeFieldOptions {
  text: string;
  value: string;
}

export const getTimeFieldOptions = (
  fields: Array<{ type: string; name: string }>
): TimeFieldOptions[] => {
  const options: TimeFieldOptions[] = [];

  fields.forEach((field: { type: string; name: string }) => {
    if (field.type === 'date' || field.type === 'date_nanos') {
      options.push({
        text: field.name,
        value: field.name,
      });
    }
  });
  return options;
};
