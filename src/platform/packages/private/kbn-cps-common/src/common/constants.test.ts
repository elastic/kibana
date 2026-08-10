/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING, isCustomProjectRouting } from './constants';

describe('isCustomProjectRouting', () => {
  it('returns false for undefined', () => {
    expect(isCustomProjectRouting(undefined)).toBe(false);
  });

  it('returns false for the default _alias:* value', () => {
    expect(isCustomProjectRouting(PROJECT_ROUTING.ALL)).toBe(false);
  });

  it('returns true for the origin-only preset', () => {
    expect(isCustomProjectRouting(PROJECT_ROUTING.ORIGIN)).toBe(true);
  });

  it('returns true for an arbitrary custom expression', () => {
    expect(isCustomProjectRouting('_alias:foo')).toBe(true);
    expect(isCustomProjectRouting('project:test-project')).toBe(true);
  });

  it('returns true for an empty string', () => {
    // Empty string is not the default; treat it as a custom (and likely invalid) expression
    expect(isCustomProjectRouting('')).toBe(true);
  });
});
