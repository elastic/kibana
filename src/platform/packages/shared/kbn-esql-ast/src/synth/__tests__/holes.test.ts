/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { query } from '../query';

describe('number shorthand', () => {
  test('can insert an integer shorthand', () => {
    const query1 = query`FROM index | WHERE coordinates.lat >= ${123}`;

    expect(query1 + '').toBe('FROM index | WHERE coordinates.lat >= 123');
  });

  test('can insert a float shorthand', () => {
    const query1 = query`FROM index | WHERE coordinates.lat >= ${0.1}`;

    expect(query1 + '').toBe('FROM index | WHERE coordinates.lat >= 0.1');
  });
});

describe('column shorthand', () => {
  test('can insert a column shorthand', () => {
    const query1 = query`FROM index | WHERE ${['coordinates', 'lat']} >= ${0.1}`;

    expect(query1 + '').toBe('FROM index | WHERE coordinates.lat >= 0.1');
  });

  test('escapes column names on "." character', () => {
    const query1 = query`FROM index | WHERE ${['coordinates.lat']} >= ${0.1}`;

    expect(query1 + '').toBe('FROM index | WHERE `coordinates.lat` >= 0.1');
  });

  test('non-nested column name', () => {
    const query1 = query`FROM index | WHERE ${['my_column']} >= ${0.1}`;

    expect(query1 + '').toBe('FROM index | WHERE my_column >= 0.1');
  });

  test('escapes when special chars used', () => {
    const query1 = query`FROM index | WHERE ${['my_column', '❤️']} >= ${0.1}`;

    expect(query1 + '').toBe('FROM index | WHERE my_column.`❤️` >= 0.1');
  });
});
