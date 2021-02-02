/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const momentMock = {
  locale: jest.fn(() => 'default-locale'),
  tz: {
    setDefault: jest.fn(),
    zone: jest.fn(
      (z) => [{ name: 'tz1' }, { name: 'tz2' }, { name: 'tz3' }].find((f) => z === f.name) || null
    ),
  },
  weekdays: jest.fn(() => ['dow1', 'dow2', 'dow3']),
  updateLocale: jest.fn(),
};
jest.doMock('moment-timezone', () => momentMock);
