/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeOptions, getTimeFieldOptions } from './get_time_options';

describe('get_time_options', () => {
  test('if getTimeOptions return single unit time options', () => {
    const timeUnitValue = getTimeOptions(1);
    expect(timeUnitValue).toMatchObject([
      { text: 'second', value: 's' },
      { text: 'minute', value: 'm' },
      { text: 'hour', value: 'h' },
      { text: 'day', value: 'd' },
    ]);
  });

  test('if getTimeOptions return multiple unit time options', () => {
    const timeUnitValue = getTimeOptions(10);
    expect(timeUnitValue).toMatchObject([
      { text: 'seconds', value: 's' },
      { text: 'minutes', value: 'm' },
      { text: 'hours', value: 'h' },
      { text: 'days', value: 'd' },
    ]);
  });

  test('if getTimeFieldOptions return only date type fields', () => {
    const timeOnlyTypeFields = getTimeFieldOptions([
      { type: 'date', name: 'order_date' },
      { type: 'date_nanos', name: 'order_date_nanos' },
      { type: 'number', name: 'sum' },
    ]);
    expect(timeOnlyTypeFields).toMatchObject([
      { text: 'order_date', value: 'order_date' },
      { text: 'order_date_nanos', value: 'order_date_nanos' },
    ]);
  });
});
