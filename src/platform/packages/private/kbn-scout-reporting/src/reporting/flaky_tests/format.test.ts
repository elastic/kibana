/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatRate } from './format';

describe('formatRate', () => {
  it('renders a ratio as a percentage with one decimal', () => {
    expect(formatRate(0.096)).toBe('9.6%');
    expect(formatRate(0)).toBe('0.0%');
    expect(formatRate(1)).toBe('100.0%');
  });
});
