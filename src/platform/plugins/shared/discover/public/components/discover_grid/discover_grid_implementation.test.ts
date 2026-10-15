/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_ENABLE_TANSTACK_TABLE,
  resolveDiscoverGridImplementation,
  toDiscoverGridImplementation,
} from './discover_grid_implementation';

describe('discover grid implementation', () => {
  it('maps the enableTanstackTable feature flag to a grid implementation', () => {
    expect(toDiscoverGridImplementation(true)).toBe('tanstack');
    expect(toDiscoverGridImplementation(false)).toBe('unified');
    expect(toDiscoverGridImplementation(DEFAULT_ENABLE_TANSTACK_TABLE)).toBe('tanstack');
  });

  it('resolves known values and falls back when the value is missing or invalid', () => {
    expect(resolveDiscoverGridImplementation('unified')).toBe('unified');
    expect(resolveDiscoverGridImplementation('tanstack')).toBe('tanstack');
    expect(resolveDiscoverGridImplementation(undefined)).toBe('tanstack');
    expect(resolveDiscoverGridImplementation('eui')).toBe('tanstack');
  });
});
