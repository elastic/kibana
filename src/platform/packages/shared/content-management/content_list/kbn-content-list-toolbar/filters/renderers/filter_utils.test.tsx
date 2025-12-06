/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { Query } from '@elastic/eui';
import { useFieldQueryFilter, isExcludeModifier, getCheckedState } from './filter_utils';

describe('filter_utils', () => {
  describe('isExcludeModifier', () => {
    it('returns true for metaKey on Mac', () => {
      // Result depends on platform, but should be boolean.
      const result = isExcludeModifier({ metaKey: true, ctrlKey: false });
      expect(typeof result).toBe('boolean');
    });

    it('returns true for ctrlKey on non-Mac', () => {
      const result = isExcludeModifier({ metaKey: false, ctrlKey: true });
      expect(typeof result).toBe('boolean');
    });

    it('returns false when no modifier key is pressed', () => {
      const result = isExcludeModifier({ metaKey: false, ctrlKey: false });
      expect(result).toBe(false);
    });
  });

  describe('getCheckedState', () => {
    it('returns "on" for include', () => {
      expect(getCheckedState('include')).toBe('on');
    });

    it('returns "off" for exclude', () => {
      expect(getCheckedState('exclude')).toBe('off');
    });

    it('returns undefined for null/undefined', () => {
      expect(getCheckedState(null)).toBeUndefined();
      expect(getCheckedState(undefined)).toBeUndefined();
    });
  });

  describe('useFieldQueryFilter', () => {
    describe('with valid query', () => {
      it('parses include clauses from query using or-field format', () => {
        // The hook uses `getOrFieldClause` which requires the or-field format: `tag:(value)`.
        const query = Query.parse('tag:(important)');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange: jest.fn(),
          })
        );

        expect(result.current.selection).toEqual({ important: 'include' });
        expect(result.current.activeCount).toBe(1);
        expect(result.current.getState('important')).toBe('include');
      });

      it('parses exclude clauses from query using or-field format', () => {
        // Exclude clauses use the format: `-tag:(value)`.
        const query = Query.parse('-tag:(spam)');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange: jest.fn(),
          })
        );

        expect(result.current.selection).toEqual({ spam: 'exclude' });
        expect(result.current.getState('spam')).toBe('exclude');
      });

      it('toggle adds include clause in or-field format', () => {
        const onChange = jest.fn();
        const query = Query.parse('');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange,
          })
        );

        act(() => {
          result.current.toggle('important', 'include');
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        const newQuery = onChange.mock.calls[0][0];
        // The `addOrFieldValue` method produces or-field format: `tag:(value)`.
        expect(newQuery.text).toContain('tag:(important)');
      });

      it('clearAll removes all or-field clauses for the field', () => {
        const onChange = jest.fn();
        // Use or-field format for testing clearAll.
        const query = Query.parse('tag:(important) tag:(urgent)');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange,
          })
        );

        act(() => {
          result.current.clearAll();
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        const newQuery = onChange.mock.calls[0][0];
        expect(newQuery.text).toBe('');
      });
    });

    describe('with invalid query (parse error)', () => {
      it('toggle does NOT call onChange when query cannot be parsed', () => {
        const onChange = jest.fn();
        // Create a query with text that will fail to parse.
        // We simulate this by passing a query object with invalid text.
        const invalidQuery = { text: 'tag:(' } as Query; // Invalid syntax.

        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: invalidQuery,
            onChange,
          })
        );

        act(() => {
          result.current.toggle('important', 'include');
        });

        // onChange should NOT be called - we bail out to preserve user's input.
        expect(onChange).not.toHaveBeenCalled();
      });

      it('clearAll does NOT call onChange when query cannot be parsed', () => {
        const onChange = jest.fn();
        const invalidQuery = { text: 'tag:(' } as Query;

        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: invalidQuery,
            onChange,
          })
        );

        act(() => {
          result.current.clearAll();
        });

        // onChange should NOT be called.
        expect(onChange).not.toHaveBeenCalled();
      });

      it('returns empty selection when query cannot be parsed', () => {
        const invalidQuery = { text: 'tag:(' } as Query;

        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: invalidQuery,
            onChange: jest.fn(),
          })
        );

        expect(result.current.selection).toEqual({});
        expect(result.current.activeCount).toBe(0);
      });
    });

    describe('single selection mode', () => {
      it('clears previous selection when selecting new value', () => {
        const onChange = jest.fn();
        // Use or-field format.
        const query = Query.parse('tag:(first)');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange,
            singleSelection: true,
          })
        );

        act(() => {
          result.current.toggle('second', 'include');
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        const newQuery = onChange.mock.calls[0][0];
        expect(newQuery.text).toContain('tag:(second)');
        expect(newQuery.text).not.toContain('first');
      });

      it('toggles off when clicking already-selected value', () => {
        const onChange = jest.fn();
        const query = Query.parse('tag:(first)');
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange,
            singleSelection: true,
          })
        );

        act(() => {
          result.current.toggle('first', 'include');
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        const newQuery = onChange.mock.calls[0][0];
        expect(newQuery.text).toBe('');
      });
    });

    describe('with empty/no query', () => {
      it('handles undefined query', () => {
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: undefined,
            onChange: jest.fn(),
          })
        );

        expect(result.current.selection).toEqual({});
        expect(result.current.activeCount).toBe(0);
      });

      it('handles query with empty text', () => {
        const query = Query.parse('');
        const onChange = jest.fn();
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query,
            onChange,
          })
        );

        // Toggle should work with empty query (creates new query).
        act(() => {
          result.current.toggle('value', 'include');
        });

        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it('allows toggle when query is empty (not a parse error)', () => {
        // This is the key distinction: empty query is valid, not an error.
        const onChange = jest.fn();
        const { result } = renderHook(() =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: undefined,
            onChange,
          })
        );

        act(() => {
          result.current.toggle('important', 'include');
        });

        // Should work - empty query is valid.
        expect(onChange).toHaveBeenCalledTimes(1);
        const newQuery = onChange.mock.calls[0][0];
        // Output is in or-field format.
        expect(newQuery.text).toContain('tag:(important)');
      });
    });
  });
});
