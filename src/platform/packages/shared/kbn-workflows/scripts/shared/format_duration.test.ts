/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatDuration } from './format_duration';

describe('formatDuration', () => {
  it('should return elapsed time formatted as seconds with two decimals', () => {
    expect(formatDuration(1000, 2500)).toBe('1.50s');
  });
});
