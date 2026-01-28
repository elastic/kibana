/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { parseFiltersFromChildren, DEFAULT_FILTER_ORDER, KNOWN_FILTER_IDS } from './parse_children';
import { StarredFilter } from './markers/starred';
import { SortFilter } from './markers/sort';
import { TagsFilter } from './markers/tags';
import { CreatedByFilter } from './markers/created_by';
import { Filter } from './markers/filter';

describe('parse_children', () => {
  describe('constants', () => {
    it('exports DEFAULT_FILTER_ORDER', () => {
      expect(DEFAULT_FILTER_ORDER).toEqual(['sort', 'tags', 'createdBy', 'starred']);
    });

    it('exports KNOWN_FILTER_IDS', () => {
      expect(KNOWN_FILTER_IDS).toEqual(['starred', 'sort', 'tags', 'createdBy']);
    });
  });

  describe('parseFiltersFromChildren', () => {
    it('returns empty arrays for undefined children', () => {
      const [filterIds, filterProps] = parseFiltersFromChildren(undefined);
      expect(filterIds).toEqual([]);
      expect(filterProps).toEqual({});
    });

    it('returns empty arrays for null children', () => {
      const [filterIds, filterProps] = parseFiltersFromChildren(null);
      expect(filterIds).toEqual([]);
      expect(filterProps).toEqual({});
    });

    it('parses StarredFilter correctly', () => {
      const children = React.createElement(StarredFilter, { name: 'My Starred' });
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['starred']);
      expect(filterProps.starred).toEqual({ name: 'My Starred' });
    });

    it('parses SortFilter correctly', () => {
      const children = React.createElement(SortFilter, { 'data-test-subj': 'sortFilter' });
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['sort']);
      expect(filterProps.sort).toEqual({ 'data-test-subj': 'sortFilter' });
    });

    it('parses TagsFilter correctly', () => {
      const children = React.createElement(TagsFilter, { tagManagementUrl: '/app/tags' });
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['tags']);
      expect(filterProps.tags).toEqual({ tagManagementUrl: '/app/tags' });
    });

    it('parses CreatedByFilter correctly', () => {
      const children = React.createElement(CreatedByFilter, { showNoUserOption: false });
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['createdBy']);
      expect(filterProps.createdBy).toEqual({ showNoUserOption: false });
    });

    it('parses custom Filter correctly using field prop as ID', () => {
      const children = React.createElement(Filter, { field: 'status' });
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['status']);
      expect(filterProps.status).toEqual({ field: 'status' });
    });

    it('preserves order of multiple filters', () => {
      const children = [
        React.createElement(SortFilter, { key: 'sort' }),
        React.createElement(StarredFilter, { key: 'starred' }),
        React.createElement(TagsFilter, { key: 'tags' }),
      ];
      const [filterIds] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['sort', 'starred', 'tags']);
    });

    it('ignores duplicate filter IDs and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const children = [
        React.createElement(StarredFilter, { key: 'starred1' }),
        React.createElement(StarredFilter, { key: 'starred2' }),
      ];
      const [filterIds] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['starred']);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate filter ID: starred')
      );
      consoleSpy.mockRestore();
    });

    it('ignores Filter without field prop and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      // Create a Filter element without the required field prop.
      const FilterWithoutField = (props: Record<string, unknown>) =>
        React.createElement(Filter, props);
      (FilterWithoutField as unknown as { displayName: string }).displayName = 'Filter';
      const children = React.createElement(FilterWithoutField, {});
      const [filterIds] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required "field" prop')
      );
      consoleSpy.mockRestore();
    });

    it('ignores non-filter elements', () => {
      const children = [
        React.createElement('div', { key: 'div' }),
        React.createElement(StarredFilter, { key: 'starred' }),
        React.createElement('span', { key: 'span' }),
      ];
      const [filterIds] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['starred']);
    });

    it('ignores elements without displayName', () => {
      const NoDisplayName = () => null;
      const children = [
        React.createElement(NoDisplayName, { key: 'noop' }),
        React.createElement(StarredFilter, { key: 'starred' }),
      ];
      const [filterIds] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['starred']);
    });

    it('handles mixed pre-built and custom filters', () => {
      const children = [
        React.createElement(StarredFilter, { key: 'starred' }),
        React.createElement(Filter, { key: 'status', field: 'status' }),
        React.createElement(TagsFilter, { key: 'tags', tagManagementUrl: '/tags' }),
        React.createElement(Filter, { key: 'type', field: 'type' }),
      ];
      const [filterIds, filterProps] = parseFiltersFromChildren(children);
      expect(filterIds).toEqual(['starred', 'status', 'tags', 'type']);
      expect(filterProps.starred).toEqual({});
      expect(filterProps.status).toEqual({ field: 'status' });
      expect(filterProps.tags).toEqual({ tagManagementUrl: '/tags' });
      expect(filterProps.type).toEqual({ field: 'type' });
    });
  });
});
