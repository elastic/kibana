/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Query } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  FilterCountBadge,
  ModifierKeyTip,
  getCheckedState,
  isExcludeModifier,
  useFieldQueryFilter,
} from './filter_utils';

describe('filter utilities', () => {
  describe('isExcludeModifier', () => {
    it('returns false when no modifier keys are pressed', () => {
      expect(isExcludeModifier({ metaKey: false, ctrlKey: false })).toBe(false);
    });
  });

  describe('getCheckedState', () => {
    it('maps include and exclude states to EuiSelectable checked values', () => {
      expect(getCheckedState('include')).toBe('on');
      expect(getCheckedState('exclude')).toBe('off');
      expect(getCheckedState(undefined)).toBeUndefined();
    });
  });

  describe('useFieldQueryFilter', () => {
    it('reads OR-field clauses and simple clauses from the query', () => {
      const query = Query.parse('tag:Archived')
        .addOrFieldValue('tag', 'Production', true, 'eq')
        .addOrFieldValue('tag', 'Internal', false, 'eq');

      const { result } = renderHook(() =>
        useFieldQueryFilter({
          fieldName: 'tag',
          query,
        })
      );

      expect(result.current.selection).toEqual({
        Production: 'include',
        Internal: 'exclude',
        Archived: 'include',
      });
      expect(result.current.activeCount).toBe(3);
      expect(result.current.getState('Internal')).toBe('exclude');
    });

    it('replaces the current value in single-selection mode and clears it when toggled again', () => {
      const onChange = jest.fn();
      const query = Query.parse('').addOrFieldValue('tag', 'Production', true, 'eq');

      const { result, rerender } = renderHook(
        ({ currentQuery }) =>
          useFieldQueryFilter({
            fieldName: 'tag',
            query: currentQuery,
            onChange,
            singleSelection: true,
          }),
        {
          initialProps: { currentQuery: query },
        }
      );

      act(() => {
        result.current.toggle('Archived', 'include');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].text).toContain('tag:(Archived)');
      expect(onChange.mock.calls[0][0].text).not.toContain('Production');

      rerender({ currentQuery: onChange.mock.calls[0][0] as Query });

      act(() => {
        result.current.toggle('Archived', 'include');
      });

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange.mock.calls[1][0].text).toBe('');
    });

    it('flips a simple include clause to exclude in multi-select mode', () => {
      const onChange = jest.fn();

      const { result } = renderHook(() =>
        useFieldQueryFilter({
          fieldName: 'tag',
          query: Query.parse('tag:Production'),
          onChange,
        })
      );

      act(() => {
        result.current.toggle('Production', 'exclude');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].text).toBe('-tag:(Production)');
    });

    it('clears both OR-field and simple clauses', () => {
      const onChange = jest.fn();
      const query = Query.parse('tag:Archived').addOrFieldValue('tag', 'Production', true, 'eq');

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
      expect(onChange.mock.calls[0][0].text).toBe('');
    });
  });

  describe('render helpers', () => {
    it('renders the modifier key help text', () => {
      render(<ModifierKeyTip />);

      expect(screen.getByText(/\+ click exclude/)).toBeInTheDocument();
    });

    it('renders the filter count badge with active styling', () => {
      render(<FilterCountBadge count={3} isActive />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
