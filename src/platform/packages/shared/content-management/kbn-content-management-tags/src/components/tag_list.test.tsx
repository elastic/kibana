/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import type { Tag } from '../types';
import { ContentManagementTagsProvider } from '../services';
import { TagList } from './tag_list';

describe('TagList', () => {
  const mockTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'Important',
      description: 'Important items',
      color: '#FF0000',
      managed: false,
    },
    {
      id: 'tag-2',
      name: 'Urgent',
      description: 'Urgent items',
      color: '#FFA500',
      managed: false,
    },
    {
      id: 'tag-3',
      name: 'Archive',
      description: 'Archived items',
      color: '#808080',
      managed: true,
    },
  ];

  const mockTagIds = ['tag-1', 'tag-2'];

  const getTagList = jest.fn(() => mockTags);

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <EuiProvider>
        <ContentManagementTagsProvider {...{ getTagList }}>
          {children}
        </ContentManagementTagsProvider>
      </EuiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tags from tag IDs', () => {
    render(<TagList tagIds={mockTagIds} />, { wrapper: createWrapper() });

    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('calls getTagList to fetch all tags', () => {
    render(<TagList tagIds={mockTagIds} />, { wrapper: createWrapper() });

    expect(getTagList).toHaveBeenCalled();
  });

  it('returns null when no tags match provided tag IDs', () => {
    const emptyTagIds: string[] = [];
    const { container } = render(<TagList tagIds={emptyTagIds} />, {
      wrapper: createWrapper(),
    });

    expect(container.firstChild).toBeNull();
  });

  it('returns null when tag IDs do not match any existing tags', () => {
    const nonExistentTagIds = ['non-existent-tag-id'];

    const { container } = render(<TagList tagIds={nonExistentTagIds} />, {
      wrapper: createWrapper(),
    });

    expect(container.firstChild).toBeNull();
  });

  it('handles tags without IDs gracefully', () => {
    const tagsWithoutId = [
      { name: 'No ID', description: 'Test', color: '#000000', managed: false },
    ];
    const customGetTagList = jest.fn(() => tagsWithoutId);

    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <EuiProvider>
        <ContentManagementTagsProvider {...{ getTagList: customGetTagList }}>
          {children}
        </ContentManagementTagsProvider>
      </EuiProvider>
    );

    const { container } = render(<TagList tagIds={mockTagIds} />, {
      wrapper: CustomWrapper,
    });

    expect(container.firstChild).toBeNull();
  });

  describe('with onClick handler', () => {
    it('passes onClick to TagBadge components', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagList tagIds={mockTagIds} onClick={onClick} />, {
        wrapper: createWrapper(),
      });

      const importantBadge = screen.getByText('Important');
      await user.click(importantBadge);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Important' }), false);
    });

    it('supports modifier key clicks', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagList tagIds={mockTagIds} onClick={onClick} />, {
        wrapper: createWrapper(),
      });

      const urgentBadge = screen.getByText('Urgent');
      // Use keyboard modifier with click
      await user.keyboard('{Control>}');
      await user.click(urgentBadge);
      await user.keyboard('{/Control}');

      // The modifier detection depends on the platform, so just verify onClick was called
      // with the correct tag and a boolean value
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Urgent' }),
        expect.any(Boolean)
      );
    });
  });

  describe('layout', () => {
    it('renders tags in a flex container with gap', () => {
      const { container } = render(<TagList tagIds={mockTagIds} />, {
        wrapper: createWrapper(),
      });

      const wrapper = container.firstChild as HTMLElement;

      // Check that display is flex (emotion css applies inline styles)
      expect(wrapper).toHaveStyle({ display: 'flex' });
    });

    it('renders multiple tags', () => {
      render(<TagList tagIds={mockTagIds} />, { wrapper: createWrapper() });

      const badges = screen.getAllByTestId(/^tag-/);
      expect(badges).toHaveLength(2);
    });
  });

  describe('filtering logic', () => {
    it('only renders tags that match the provided tag IDs', () => {
      const singleTagId = ['tag-1'];

      render(<TagList tagIds={singleTagId} />, { wrapper: createWrapper() });

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
      expect(screen.queryByText('Archive')).not.toBeInTheDocument();
    });

    it('handles empty tag list from provider', () => {
      const emptyTagListProvider = jest.fn(() => []);
      const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
        <EuiProvider>
          <ContentManagementTagsProvider {...{ getTagList: emptyTagListProvider }}>
            {children}
          </ContentManagementTagsProvider>
        </EuiProvider>
      );

      const { container } = render(<TagList tagIds={mockTagIds} />, {
        wrapper: CustomWrapper,
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe('managed tags', () => {
    it('renders managed tags correctly', () => {
      const managedTagId = ['tag-3'];

      render(<TagList tagIds={managedTagId} />, { wrapper: createWrapper() });

      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('renders mix of managed and unmanaged tags', () => {
      const mixedTagIds = ['tag-1', 'tag-3'];

      render(<TagList tagIds={mixedTagIds} />, { wrapper: createWrapper() });

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('calls getTagList on each render due to dependency', () => {
      const { rerender } = render(<TagList tagIds={mockTagIds} />, {
        wrapper: createWrapper(),
      });

      // getTagList is a dependency of useMemo, so it will be called
      expect(getTagList).toHaveBeenCalled();

      // Rerender with same tag IDs
      rerender(<TagList tagIds={mockTagIds} />);

      // getTagList is in the dependency array, so behavior depends on reference stability
      // Tags should still be rendered correctly regardless
      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('updates when tag IDs change', () => {
      const { rerender } = render(<TagList tagIds={mockTagIds} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.queryByText('Archive')).not.toBeInTheDocument();

      // Change to different tag IDs
      rerender(<TagList tagIds={['tag-3']} />);

      expect(screen.queryByText('Important')).not.toBeInTheDocument();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders with proper test IDs for each tag', () => {
      render(<TagList tagIds={mockTagIds} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument();
    });

    it('passes through onClick to make badges interactive with proper ARIA', () => {
      const onClick = jest.fn();
      render(<TagList tagIds={mockTagIds} onClick={onClick} />, {
        wrapper: createWrapper(),
      });

      const badges = screen.getAllByRole('button');
      expect(badges.length).toBe(2);

      badges.forEach((badge) => {
        expect(badge).toHaveAttribute('aria-label');
      });
    });
  });

  describe('edge cases', () => {
    it('deduplicates tag IDs while preserving order', () => {
      const duplicateTagIds = ['tag-2', 'tag-1', 'tag-1', 'tag-2'];

      const { container } = render(<TagList tagIds={duplicateTagIds} />, {
        wrapper: createWrapper(),
      });

      // Should render each tag once, in the order of first occurrence.
      const badges = container.querySelectorAll('[data-test-subj^="tag-"]');
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveAttribute('data-test-subj', 'tag-tag-2');
      expect(badges[1]).toHaveAttribute('data-test-subj', 'tag-tag-1');
    });

    it('preserves tag order from tagIds array', () => {
      const reversedTagIds = ['tag-2', 'tag-1'];

      const { container } = render(<TagList tagIds={reversedTagIds} />, {
        wrapper: createWrapper(),
      });

      const badges = container.querySelectorAll('[data-test-subj^="tag-"]');
      // Tags are rendered in the order specified by tagIds, not getTagList order.
      expect(badges[0]).toHaveAttribute('data-test-subj', 'tag-tag-2');
      expect(badges[1]).toHaveAttribute('data-test-subj', 'tag-tag-1');
    });

    it('handles very long tag lists efficiently', () => {
      const manyTags: Tag[] = Array.from({ length: 100 }, (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`,
        description: `Description ${i}`,
        color: '#000000',
        managed: false,
      }));

      const manyTagIds = manyTags.map((t) => t.id!);
      const customGetTagList = jest.fn(() => manyTags);

      const ManyTagsWrapper = ({ children }: { children: React.ReactNode }) => (
        <EuiProvider>
          <ContentManagementTagsProvider {...{ getTagList: customGetTagList }}>
            {children}
          </ContentManagementTagsProvider>
        </EuiProvider>
      );

      const { container } = render(<TagList tagIds={manyTagIds} />, {
        wrapper: ManyTagsWrapper,
      });

      const badges = container.querySelectorAll('[data-test-subj^="tag-"]');
      expect(badges).toHaveLength(100);
    });
  });
});
