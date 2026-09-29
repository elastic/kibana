/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const momentMock = {
  locale: vi.fn(() => 'default-locale'),
  tz: {
    setDefault: vi.fn(),
    guess: vi.fn(),
    zone: vi.fn(
      (z) => [{ name: 'tz1' }, { name: 'tz2' }, { name: 'tz3' }].find((f) => z === f.name) || null
    ),
  },
  weekdays: vi.fn(() => ['dow1', 'dow2', 'dow3']),
  updateLocale: vi.fn(),
};
vi.doMock('moment-timezone', () => momentMock);
