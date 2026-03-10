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
import { TagFilterRenderer } from './tags';

// Ensure preset resolve callbacks are registered.
import './sort/sort';
import './tags/tag_filter';

const createContext = (overrides: Partial<FilterContext> = {}): FilterContext => ({
  hasSorting: false,
  hasTags: false,
  ...overrides,
});

const createSortPart = (): ParsedPart => ({
  type: 'part',
  part: 'filter',
  preset: 'sort',
  instanceId: 'sort',
  attributes: {},
});

const createTagsPart = (): ParsedPart => ({
  type: 'part',
  part: 'filter',
  preset: 'tags',
  instanceId: 'tags',
  attributes: {},
});

describe('filter.resolve', () => {
  describe('sort preset', () => {
    it('returns a `SearchFilterConfig` for the sort preset when sorting is available.', () => {
      const result = filter.resolve(createSortPart(), createContext({ hasSorting: true }));

      expect(result).toBeDefined();
      expect(result).toMatchObject({ type: 'custom_component' });
      expect((result as { component: unknown }).component).toBe(SortRenderer);
    });

    it('returns `undefined` for the sort preset when sorting is unavailable.', () => {
      const result = filter.resolve(createSortPart(), createContext({ hasSorting: false }));

      expect(result).toBeUndefined();
    });
  });

  describe('tags preset', () => {
    it('returns a `SearchFilterConfig` for the tags preset when tags are available.', () => {
      const result = filter.resolve(createTagsPart(), createContext({ hasTags: true }));

      expect(result).toBeDefined();
      expect(result).toMatchObject({ type: 'custom_component' });
      expect((result as { component: unknown }).component).toBe(TagFilterRenderer);
    });

    it('returns `undefined` for the tags preset when tags are unavailable.', () => {
      const result = filter.resolve(createTagsPart(), createContext({ hasTags: false }));

      expect(result).toBeUndefined();
    });
  });

  it('returns `undefined` for an unknown preset.', () => {
    const unknownPart: ParsedPart = {
      type: 'part',
      part: 'filter',
      preset: 'unknown-filter',
      instanceId: 'unknown-filter',
      attributes: {},
    };
    const result = filter.resolve(unknownPart, createContext({ hasSorting: true }));

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
    const result = filter.resolve(noPresetPart, createContext({ hasSorting: true }));

    expect(result).toBeUndefined();
  });
});
