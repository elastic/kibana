/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateTimeRange } from './validate_timerange';

describe('Validate timerange', () => {
  test('Validate no range', () => {
    const ok = validateTimeRange();

    expect(ok).toBe(false);
  });
  test('normal range', () => {
    const ok = validateTimeRange({
      to: 'now',
      from: 'now-7d',
    });

    expect(ok).toBe(true);
  });
  test('bad from time', () => {
    const ok = validateTimeRange({
      to: 'nowa',
      from: 'now-7d',
    });

    expect(ok).toBe(false);
  });
  test('bad to time', () => {
    const ok = validateTimeRange({
      to: 'now',
      from: 'nowa-7d',
    });

    expect(ok).toBe(false);
  });
});
