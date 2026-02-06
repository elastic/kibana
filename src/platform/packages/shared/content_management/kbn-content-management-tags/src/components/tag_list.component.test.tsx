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
import { TagListComponent } from './tag_list.component';

describe('TagListComponent', () => {
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

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <EuiProvider>{children}</EuiProvider>
  );

  describe('rendering', () => {
    it('renders all provided tags as badges', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('returns null when tags array is empty', () => {
      const { container } = render(<TagListComponent tags={[]} />, {
        wrapper: createWrapper,
      });

      expect(container.firstChild).toBeNull();
    });

    it('renders tags with correct test IDs', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-2')).toBeInTheDocument();
      expect(screen.getByTestId('tag-tag-3')).toBeInTheDocument();
    });

    it('renders a single tag correctly', () => {
      const singleTag = [mockTags[0]];

      render(<TagListComponent tags={singleTag} />, { wrapper: createWrapper });

      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('renders tags in a flex container', () => {
      const { container } = render(<TagListComponent tags={mockTags} />, {
        wrapper: createWrapper,
      });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ display: 'flex' });
    });

    it('applies flex-wrap style for responsive display', () => {
      const { container } = render(<TagListComponent tags={mockTags} />, {
        wrapper: createWrapper,
      });

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ flexWrap: 'wrap' });
    });
  });

  describe('with onClick handler', () => {
    it('passes onClick to each TagBadge', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      const importantBadge = screen.getByText('Important');
      await user.click(importantBadge);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Important', id: 'tag-1' }),
        false
      );
    });

    it('allows clicking different tags', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      await user.click(screen.getByText('Important'));
      await user.click(screen.getByText('Urgent'));
      await user.click(screen.getByText('Archive'));

      expect(onClick).toHaveBeenCalledTimes(3);
      expect(onClick).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: 'Important' }),
        false
      );
      expect(onClick).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: 'Urgent' }),
        false
      );
      expect(onClick).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ name: 'Archive' }),
        false
      );
    });

    it('supports modifier key clicks', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      const badge = screen.getByText('Important');

      await user.keyboard('{Control>}');
      await user.click(badge);
      await user.keyboard('{/Control}');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Important' }),
        expect.any(Boolean)
      );
    });

    it('renders badges as buttons when onClick is provided', () => {
      const onClick = jest.fn();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });
  });

  describe('without onClick handler', () => {
    it('renders non-interactive badges', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('tag properties', () => {
    it('displays tag colors correctly', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      const badge = screen.getByText('Important').closest('.euiBadge');
      expect(badge).toHaveAttribute('style', expect.stringContaining('--euiBadgeBackgroundColor'));
    });

    it('displays tag descriptions as tooltips', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      const badge = screen.getByText('Important').closest('.euiBadge');
      expect(badge).toHaveAttribute('title', 'Important items');
    });

    it('renders both managed and unmanaged tags', () => {
      render(<TagListComponent tags={mockTags} />, { wrapper: createWrapper });

      // Archive is managed, others are not - all should render the same.
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Important')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles tags without IDs', () => {
      const tagsWithoutIds: Tag[] = [
        {
          name: 'No ID Tag',
          description: 'Tag without ID',
          color: '#00FF00',
          managed: false,
        },
      ];

      render(<TagListComponent tags={tagsWithoutIds} />, { wrapper: createWrapper });

      expect(screen.getByText('No ID Tag')).toBeInTheDocument();
      expect(screen.getByTestId('tag-undefined')).toBeInTheDocument();
    });

    it('handles very long tag lists', () => {
      const manyTags: Tag[] = Array.from({ length: 50 }, (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`,
        description: `Description ${i}`,
        color: '#000000',
        managed: false,
      }));

      const { container } = render(<TagListComponent tags={manyTags} />, {
        wrapper: createWrapper,
      });

      const badges = container.querySelectorAll('[data-test-subj^="tag-"]');
      expect(badges).toHaveLength(50);
    });

    it('preserves tag order from props', () => {
      const orderedTags: Tag[] = [
        { id: 'c', name: 'Charlie', description: '', color: '#000', managed: false },
        { id: 'a', name: 'Alpha', description: '', color: '#000', managed: false },
        { id: 'b', name: 'Bravo', description: '', color: '#000', managed: false },
      ];

      const { container } = render(<TagListComponent tags={orderedTags} />, {
        wrapper: createWrapper,
      });

      const badges = container.querySelectorAll('[data-test-subj^="tag-"]');
      expect(badges[0]).toHaveAttribute('data-test-subj', 'tag-c');
      expect(badges[1]).toHaveAttribute('data-test-subj', 'tag-a');
      expect(badges[2]).toHaveAttribute('data-test-subj', 'tag-b');
    });
  });

  describe('accessibility', () => {
    it('provides proper aria labels when onClick is provided', () => {
      const onClick = jest.fn();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('includes tag name in aria label', () => {
      const onClick = jest.fn();

      render(<TagListComponent tags={mockTags} onClick={onClick} />, {
        wrapper: createWrapper,
      });

      const importantButton = screen.getByRole('button', { name: 'Important tag' });
      expect(importantButton).toBeInTheDocument();
    });
  });
});
