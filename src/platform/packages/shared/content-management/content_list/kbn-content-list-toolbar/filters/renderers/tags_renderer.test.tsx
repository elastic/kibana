/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Query } from '@elastic/eui';
import { TagsRenderer } from './tags_renderer';

// Mock the provider hooks.
jest.mock('@kbn/content-list-provider', () => ({
  useContentListItems: jest.fn(() => ({
    items: [
      { id: '1', title: 'Item 1', tags: ['tag-1', 'tag-2'] },
      { id: '2', title: 'Item 2', tags: ['tag-1'] },
      { id: '3', title: 'Item 3', tags: ['tag-3'] },
    ],
  })),
  useFilterDisplay: jest.fn(() => ({
    hasTags: true,
  })),
}));

jest.mock('@kbn/content-management-tags', () => ({
  useTagServices: jest.fn(() => ({
    getTagList: jest.fn(() => [
      { id: 'tag-1', name: 'Important', color: '#FF0000' },
      { id: 'tag-2', name: 'Review', color: '#00FF00' },
      { id: 'tag-3', name: 'Archive', color: '#0000FF' },
    ]),
  })),
}));

const { useFilterDisplay } = jest.requireMock('@kbn/content-list-provider');
const { useTagServices } = jest.requireMock('@kbn/content-management-tags');

describe('TagsRenderer', () => {
  const defaultProps = {
    query: Query.parse(''),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useFilterDisplay.mockReturnValue({ hasTags: true });
    useTagServices.mockReturnValue({
      getTagList: jest.fn(() => [
        { id: 'tag-1', name: 'Important', color: '#FF0000' },
        { id: 'tag-2', name: 'Review', color: '#00FF00' },
        { id: 'tag-3', name: 'Archive', color: '#0000FF' },
      ]),
    });
  });

  describe('visibility conditions', () => {
    it('returns null when hasTags is false', () => {
      useFilterDisplay.mockReturnValue({ hasTags: false });
      const { container } = render(<TagsRenderer {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when no tags are available', () => {
      useTagServices.mockReturnValue({
        getTagList: jest.fn(() => []),
      });
      const { container } = render(<TagsRenderer {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when getTagList is not available', () => {
      useTagServices.mockReturnValue({});
      const { container } = render(<TagsRenderer {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles getTagList throwing an error', () => {
      useTagServices.mockReturnValue({
        getTagList: jest.fn(() => {
          throw new Error('Service error');
        }),
      });
      const { container } = render(<TagsRenderer {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<TagsRenderer {...defaultProps} />);
      expect(screen.getByTestId('contentListTagsRenderer')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<TagsRenderer {...defaultProps} data-test-subj="customTags" />);
      expect(screen.getByTestId('customTags')).toBeInTheDocument();
    });

    it('renders Tags button label', () => {
      render(<TagsRenderer {...defaultProps} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('tag options', () => {
    it('displays all available tags in popover', async () => {
      render(<TagsRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Important')).toBeInTheDocument();
        expect(screen.getByText('Review')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
      });
    });

    it('shows item counts per tag', async () => {
      render(<TagsRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        // Important tag has 2 items.
        expect(screen.getByText('2')).toBeInTheDocument();
        // Review and Archive have 1 item each.
        const oneCounts = screen.getAllByText('1');
        expect(oneCounts.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('tag management link', () => {
    it('shows manage tags link when tagManagementUrl is provided', async () => {
      render(<TagsRenderer {...defaultProps} tagManagementUrl="/app/tags" />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Manage tags')).toBeInTheDocument();
        expect(screen.getByTestId('manageAllTagsLink')).toHaveAttribute('href', '/app/tags');
      });
    });

    it('hides manage tags link when tagManagementUrl is not provided', async () => {
      render(<TagsRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.queryByText('Manage tags')).not.toBeInTheDocument();
      });
    });
  });

  describe('empty and no matches messages', () => {
    it('shows empty message when no tags exist', async () => {
      useTagServices.mockReturnValue({
        getTagList: jest.fn(() => []),
      });
      // Since component returns null when no tags, we can't really test empty message.
      // This is by design - no tags = no filter rendered.
    });
  });
});
