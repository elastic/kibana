/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedPart } from '@kbn/content-list-assembly';
import { filter, type FilterContext } from './part';
import { SortRenderer } from './sort';

// Ensure the sort preset's resolve callback is registered.
import './sort/sort';

const createContext = (hasSorting: boolean): FilterContext => ({ hasSorting });

const createSortPart = (): ParsedPart => ({
  type: 'part',
  part: 'filter',
  preset: 'sort',
  instanceId: 'sort',
  attributes: {},
});

describe('filter.resolve', () => {
  it('returns a `SearchFilterConfig` for the sort preset when sorting is available.', () => {
    const result = filter.resolve(createSortPart(), createContext(true));

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      type: 'custom_component',
    });
    expect((result as { component: unknown }).component).toBe(SortRenderer);
  });

  it('returns `undefined` for the sort preset when sorting is unavailable.', () => {
    const result = filter.resolve(createSortPart(), createContext(false));

    expect(result).toBeUndefined();
  });

  it('returns `undefined` for an unknown preset.', () => {
    const unknownPart: ParsedPart = {
      type: 'part',
      part: 'filter',
      preset: 'unknown-filter',
      instanceId: 'unknown-filter',
      attributes: {},
    };
    const result = filter.resolve(unknownPart, createContext(true));

    expect(result).toBeUndefined();
  });

  it('returns `undefined` for a part without a preset.', () => {
    const noPresetPart: ParsedPart = {
      type: 'part',
      part: 'filter',
      preset: undefined,
      instanceId: 'custom',
      attributes: {},
    };
    const result = filter.resolve(noPresetPart, createContext(true));

    expect(result).toBeUndefined();
  });
});
