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
import { CreatedByRenderer, NULL_USER } from './created_by_renderer';

// Mock the provider hooks.
jest.mock('@kbn/content-list-provider', () => ({
  useContentListItems: jest.fn(() => ({
    items: [
      { id: '1', title: 'Item 1', createdBy: 'user-1' },
      { id: '2', title: 'Item 2', createdBy: 'user-1' },
      { id: '3', title: 'Item 3', createdBy: 'user-2' },
      { id: '4', title: 'Item 4', createdBy: undefined },
    ],
  })),
  useContentListConfig: jest.fn(() => ({
    entityNamePlural: 'dashboards',
  })),
  useFilterDisplay: jest.fn(() => ({
    hasUsers: true,
  })),
  useContentListState: jest.fn(() => ({
    createdByResolver: {
      isSame: jest.fn((a: string, b: string) => a === b),
      getDisplayValue: jest.fn((value: string) => value),
      toIdentifier: jest.fn((value: string) => value),
    },
  })),
}));

jest.mock('@kbn/content-management-user-profiles', () => ({
  useUserProfiles: jest.fn(() => ({
    data: [
      {
        uid: 'user-1',
        user: { username: 'john', full_name: 'John Doe', email: 'john@example.com' },
      },
      {
        uid: 'user-2',
        user: { username: 'jane', full_name: 'Jane Smith', email: 'jane@example.com' },
      },
    ],
    isLoading: false,
    error: null,
  })),
  NoCreatorTip: () => <span>No creator tip</span>,
}));

jest.mock('@kbn/user-profile-components', () => ({
  UserAvatar: ({ user }: { user: { username: string } }) => <span>Avatar-{user.username}</span>,
}));

const { useFilterDisplay, useContentListItems } = jest.requireMock('@kbn/content-list-provider');
const { useUserProfiles } = jest.requireMock('@kbn/content-management-user-profiles');

describe('CreatedByRenderer', () => {
  const defaultProps = {
    query: Query.parse(''),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useFilterDisplay.mockReturnValue({ hasUsers: true });
    useContentListItems.mockReturnValue({
      items: [
        { id: '1', title: 'Item 1', createdBy: 'user-1' },
        { id: '2', title: 'Item 2', createdBy: 'user-1' },
        { id: '3', title: 'Item 3', createdBy: 'user-2' },
        { id: '4', title: 'Item 4', createdBy: undefined },
      ],
    });
    useUserProfiles.mockReturnValue({
      data: [
        {
          uid: 'user-1',
          user: { username: 'john', full_name: 'John Doe', email: 'john@example.com' },
        },
        {
          uid: 'user-2',
          user: { username: 'jane', full_name: 'Jane Smith', email: 'jane@example.com' },
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  describe('NULL_USER constant', () => {
    it('exports NULL_USER constant', () => {
      expect(NULL_USER).toBe('no-user');
    });
  });

  describe('visibility conditions', () => {
    it('returns null when hasUsers is false', () => {
      useFilterDisplay.mockReturnValue({ hasUsers: false });
      const { container } = render(<CreatedByRenderer {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when no user IDs and no items without creator', () => {
      useContentListItems.mockReturnValue({
        items: [],
      });
      useUserProfiles.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });
      const { container } = render(
        <CreatedByRenderer {...defaultProps} showNoUserOption={false} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<CreatedByRenderer {...defaultProps} />);
      expect(screen.getByTestId('contentListCreatedByRenderer')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<CreatedByRenderer {...defaultProps} data-test-subj="customCreatedBy" />);
      expect(screen.getByTestId('customCreatedBy')).toBeInTheDocument();
    });

    it('renders Created by button label', () => {
      render(<CreatedByRenderer {...defaultProps} />);
      expect(screen.getByText('Created by')).toBeInTheDocument();
    });
  });

  describe('user options', () => {
    it('displays user profiles in popover', async () => {
      render(<CreatedByRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('renders user avatars', async () => {
      render(<CreatedByRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Avatar-john')).toBeInTheDocument();
        expect(screen.getByText('Avatar-jane')).toBeInTheDocument();
      });
    });
  });

  describe('no creators option', () => {
    it('shows No creators option when showNoUserOption is true and items exist without creator', async () => {
      render(<CreatedByRenderer {...defaultProps} showNoUserOption={true} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('No creators')).toBeInTheDocument();
      });
    });

    it('hides No creators option when showNoUserOption is false', async () => {
      useContentListItems.mockReturnValue({
        items: [{ id: '1', title: 'Item 1', createdBy: 'user-1' }],
      });
      render(<CreatedByRenderer {...defaultProps} showNoUserOption={false} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.queryByText('No creators')).not.toBeInTheDocument();
      });
    });

    it('shows NoCreatorTip in No creators option', async () => {
      render(<CreatedByRenderer {...defaultProps} showNoUserOption={true} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('No creator tip')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('renders component when user profiles are loading', () => {
      useUserProfiles.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      render(<CreatedByRenderer {...defaultProps} />);
      // Component renders with loading state.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders component when user profiles fail to load', () => {
      useUserProfiles.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      });
      render(<CreatedByRenderer {...defaultProps} />);
      // Component renders with error state.
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('user display name fallbacks', () => {
    it('uses full_name when available', async () => {
      render(<CreatedByRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('falls back to username when full_name is not available', async () => {
      useUserProfiles.mockReturnValue({
        data: [{ uid: 'user-1', user: { username: 'johndoe', email: 'john@example.com' } }],
        isLoading: false,
        error: null,
      });
      useContentListItems.mockReturnValue({
        items: [{ id: '1', title: 'Item 1', createdBy: 'user-1' }],
      });
      render(<CreatedByRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      });
    });
  });
});
