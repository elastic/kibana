/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { derivePhase, type DerivePhaseInput } from './derive_phase';

const baseInput: DerivePhaseInput = {
  isLoading: false,
  isFetching: false,
  hasNoItems: false,
  hasNoResults: false,
  hasActiveQuery: false,
};

describe('derivePhase', () => {
  it("returns 'initialLoad' while the first fetch is in flight", () => {
    expect(derivePhase({ ...baseInput, isLoading: true })).toBe('initialLoad');
  });

  it("'initialLoad' wins over every other signal", () => {
    expect(
      derivePhase({
        isLoading: true,
        isFetching: true,
        hasNoItems: true,
        hasNoResults: true,
        hasActiveQuery: true,
      })
    ).toBe('initialLoad');
  });

  it("returns 'empty' when the content type has no objects and no filter is active", () => {
    expect(derivePhase({ ...baseInput, hasNoItems: true })).toBe('empty');
  });

  it("returns 'filtered' when a filter is active and zero results matched", () => {
    expect(derivePhase({ ...baseInput, hasNoResults: true, hasActiveQuery: true })).toBe(
      'filtered'
    );
  });

  it("returns 'filtering' when a filter is active and a fetch is in flight", () => {
    expect(derivePhase({ ...baseInput, isFetching: true, hasActiveQuery: true })).toBe('filtering');
  });

  it("does NOT return 'filtering' when fetching with no active filter (e.g., pagination refetch)", () => {
    expect(derivePhase({ ...baseInput, isFetching: true, hasActiveQuery: false })).toBe(
      'populated'
    );
  });

  it("returns 'populated' when items are loaded and nothing else is going on", () => {
    expect(derivePhase(baseInput)).toBe('populated');
  });

  it("does NOT re-enter 'initialLoad' on a background refetch", () => {
    // Simulating a refetch after initial load: isLoading stays false.
    expect(
      derivePhase({ ...baseInput, isLoading: false, isFetching: true, hasActiveQuery: false })
    ).toBe('populated');
  });

  it("prefers 'empty' over 'filtered' when hasNoItems is true (mutually exclusive, belt-and-braces)", () => {
    expect(derivePhase({ ...baseInput, hasNoItems: true, hasNoResults: true })).toBe('empty');
  });

  it("prefers 'filtered' over 'filtering' when both could apply", () => {
    // Edge case: the provider clears hasNoResults while fetching, so in
    // practice both won't be true simultaneously. But the precedence rule
    // is documented and tested here.
    expect(
      derivePhase({
        ...baseInput,
        isFetching: true,
        hasNoResults: true,
        hasActiveQuery: true,
      })
    ).toBe('filtered');
  });
});
