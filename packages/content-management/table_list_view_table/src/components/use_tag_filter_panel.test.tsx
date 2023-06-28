/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Ast, Query } from '@elastic/eui';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useTagFilterPanel } from './use_tag_filter_panel';

describe('useTagFilterPanel', () => {
  const query = {
    ast: {
      getOrFieldClause: jest.fn((field, value, must, operator) => {
        if (must && field === 'tag') {
          return {
            value: ['tag', 'tag'],
          };
        } else if (!must && field === 'tag') {
          return {
            value: ['tag3'],
          };
        }
        return null;
      }),
    },
  };

  const tagsToTableItemMap = {
    tag1: ['table1', 'table2'],
    tag2: ['table3'],
    tag3: ['table4'],
  };

  const getTagList = jest.fn(() => [
    { name: 'tag', id: 'tag1', description: 'Tag 1', color: 'blue' },
    { name: 'tag', id: 'tag2', description: 'Tag 2', color: 'green' },
    { name: 'tag3', id: 'tag3', description: 'Tag 3', color: 'red' },
  ]);

  const addOrRemoveIncludeTagFilter = jest.fn();
  const addOrRemoveExcludeTagFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useTagFilterPanel({
        query: null,
        tagsToTableItemMap,
        getTagList,
        addOrRemoveIncludeTagFilter,
        addOrRemoveExcludeTagFilter,
      })
    );

    expect(result.current.isPopoverOpen).toBe(false);
    expect(result.current.isInUse).toBe(false);
    expect(result.current.options).toEqual([]);
    expect(result.current.totalActiveFilters).toBe(0);
  });

  it('should initialize filter options with default state', () => {
    let ast = Ast.create([]);
    ast = ast.addOrFieldValue('tag', 'tag', true, 'eq');
    ast = ast.addOrFieldValue('tag', 'tag3', false, 'eq');
    const text = `tag:("tag") -tag:(tag3)`;
    const initialQuery = new Query(ast, undefined, text);

    const { result } = renderHook(() =>
      useTagFilterPanel({
        query: initialQuery,
        tagsToTableItemMap,
        getTagList,
        addOrRemoveIncludeTagFilter,
        addOrRemoveExcludeTagFilter,
      })
    );

    expect(result.current.totalActiveFilters).toBe(3);
  });

  it('should render options with query', async () => {
    const { result } = renderHook(
      (props) =>
        useTagFilterPanel({
          ...props,
          query: query as unknown as Query,
        }),
      {
        initialProps: {
          query: null,
          tagsToTableItemMap,
          getTagList,
          addOrRemoveIncludeTagFilter,
          addOrRemoveExcludeTagFilter,
        },
      }
    );

    result.current.onFilterButtonClick();

    await waitFor(() => {
      expect(result.current.options[0]).toEqual(
        expect.objectContaining({
          value: 'tag1',
          name: 'tag',
          checked: 'on',
        })
      );
      expect(result.current.options[1]).toEqual(
        expect.objectContaining({
          value: 'tag2',
          name: 'tag',
          checked: 'on',
        })
      );
      expect(result.current.options[2]).toEqual(
        expect.objectContaining({
          value: 'tag3',
          name: 'tag3',
          checked: 'off',
        })
      );
    });
  });

  it('should update state when isPopoverOpen changes', async () => {
    const { result } = renderHook(() =>
      useTagFilterPanel({
        query: query as unknown as Query,
        tagsToTableItemMap,
        getTagList,
        addOrRemoveIncludeTagFilter,
        addOrRemoveExcludeTagFilter,
      })
    );

    expect(result.current.isPopoverOpen).toBe(false);
    expect(result.current.isInUse).toBe(false);

    result.current.onFilterButtonClick();

    await waitFor(() => {
      expect(result.current.isPopoverOpen).toBe(true);
      expect(result.current.isInUse).toBe(true);
    });
  });
});
