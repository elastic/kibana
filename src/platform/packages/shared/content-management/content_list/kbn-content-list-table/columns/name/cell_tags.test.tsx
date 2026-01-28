/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { NameCellTags } from './cell_tags';

// Mock the external dependencies.
jest.mock('@kbn/content-management-tags', () => ({
  TagList: ({
    tagIds,
    onClick,
  }: {
    tagIds: string[];
    onClick: (tag: { name: string }) => void;
  }) => (
    <div data-test-subj="tag-list">
      {tagIds.map((id) => (
        <button key={id} data-test-subj={`tag-${id}`} onClick={() => onClick({ name: id })}>
          {id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@kbn/content-list-provider', () => ({
  useQueryFilter: jest.fn(),
}));

const { useQueryFilter } = jest.requireMock('@kbn/content-list-provider');

const renderCell = (item: ContentListItem) => {
  return render(
    <EuiProvider colorMode="light">
      <NameCellTags item={item} />
    </EuiProvider>
  );
};

describe('NameCellTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryFilter.mockReturnValue({
      toggle: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('renders TagList when item has tags', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: ['tag-1', 'tag-2'],
      };

      renderCell(item);

      expect(screen.getByTestId('tag-list')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument();
    });

    it('returns null when item has no tags', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
      };

      const { container } = renderCell(item);

      expect(container).toBeEmptyDOMElement();
    });

    it('returns null when tags array is empty', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: [],
      };

      const { container } = renderCell(item);

      expect(container).toBeEmptyDOMElement();
    });

    it('returns null when tags is undefined', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: undefined,
      };

      const { container } = renderCell(item);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('interactions', () => {
    it('calls toggle when a tag is clicked', () => {
      const toggle = jest.fn();
      useQueryFilter.mockReturnValue({ toggle });

      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: ['important'],
      };

      renderCell(item);

      const tagButton = screen.getByTestId('tag-important');
      fireEvent.click(tagButton);

      expect(toggle).toHaveBeenCalledWith('important');
    });

    it('calls useQueryFilter with tag filter type', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: ['tag-1'],
      };

      renderCell(item);

      expect(useQueryFilter).toHaveBeenCalledWith('tag');
    });

    it('does not call toggle when tag has no name', () => {
      const toggle = jest.fn();
      useQueryFilter.mockReturnValue({ toggle });

      // Mock TagList to call onClick with empty name.
      jest.doMock('@kbn/content-management-tags', () => ({
        TagList: ({ onClick }: { onClick: (tag: { name: string }) => void }) => (
          <button data-test-subj="tag-no-name" onClick={() => onClick({ name: '' })}>
            No Name
          </button>
        ),
      }));

      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: [''],
      };

      renderCell(item);

      const tagButton = screen.getByTestId('tag-');
      fireEvent.click(tagButton);

      // toggle should not be called for empty name.
      expect(toggle).not.toHaveBeenCalled();
    });
  });

  describe('multiple tags', () => {
    it('renders all tags from the item', () => {
      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: ['tag-a', 'tag-b', 'tag-c'],
      };

      renderCell(item);

      expect(screen.getByTestId('tag-tag-a')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-b')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-c')).toBeInTheDocument();
    });

    it('allows clicking different tags independently', () => {
      const toggle = jest.fn();
      useQueryFilter.mockReturnValue({ toggle });

      const item: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        tags: ['first', 'second'],
      };

      renderCell(item);

      fireEvent.click(screen.getByTestId('tag-first'));
      expect(toggle).toHaveBeenCalledWith('first');

      fireEvent.click(screen.getByTestId('tag-second'));
      expect(toggle).toHaveBeenCalledWith('second');
    });
  });
});
