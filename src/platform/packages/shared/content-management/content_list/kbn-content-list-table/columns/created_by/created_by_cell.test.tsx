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
import { CreatedByCell, type CreatedByCellProps } from './created_by_cell';

// Mock the external dependencies.
jest.mock('@kbn/content-management-user-profiles', () => ({
  UserAvatarTip: ({ uid }: { uid: string }) => <div data-test-subj="user-avatar-tip">{uid}</div>,
  ManagedAvatarTip: ({ entityName }: { entityName: string }) => (
    <div data-test-subj="managed-avatar-tip">{entityName}</div>
  ),
  NoCreatorTip: ({ iconType }: { iconType: string }) => (
    <div data-test-subj="no-creator-tip">{iconType}</div>
  ),
}));

// Mock identity resolver for testing.
const mockCreatedByResolver = {
  getCanonical: jest.fn((value: string) => value),
  getDisplay: jest.fn((value: string) => value),
  isSame: jest.fn((a: string, b: string) => a === b),
  register: jest.fn(),
  registerAll: jest.fn(),
  clear: jest.fn(),
};

jest.mock('@kbn/content-list-provider', () => ({
  useQueryFilter: jest.fn().mockReturnValue({
    toggle: jest.fn(),
  }),
  useContentListState: jest.fn().mockReturnValue({
    createdByResolver: {
      getCanonical: jest.fn((value: string) => value),
      getDisplay: jest.fn((value: string) => value),
      isSame: jest.fn((a: string, b: string) => a === b),
      register: jest.fn(),
      registerAll: jest.fn(),
      clear: jest.fn(),
    },
  }),
}));

const { useQueryFilter, useContentListState } = jest.requireMock('@kbn/content-list-provider');

const renderCell = (props: CreatedByCellProps) => {
  return render(
    <EuiProvider colorMode="light">
      <CreatedByCell {...props} />
    </EuiProvider>
  );
};

describe('CreatedByCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryFilter.mockReturnValue({ toggle: jest.fn() });
    useContentListState.mockReturnValue({ createdByResolver: mockCreatedByResolver });
  });

  describe('rendering', () => {
    it('renders UserAvatarTip when uid is provided', () => {
      renderCell({ uid: 'user-123' });

      expect(screen.getByTestId('user-avatar-tip')).toBeInTheDocument();
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('renders ManagedAvatarTip when managed is true and no uid', () => {
      renderCell({ managed: true, entityName: 'dashboard' });

      expect(screen.getByTestId('managed-avatar-tip')).toBeInTheDocument();
      expect(screen.getByText('dashboard')).toBeInTheDocument();
    });

    it('renders NoCreatorTip when no uid and not managed', () => {
      renderCell({});

      expect(screen.getByTestId('no-creator-tip')).toBeInTheDocument();
      expect(screen.getByText('minus')).toBeInTheDocument();
    });

    it('uses default entityName when not provided', () => {
      renderCell({ managed: true });

      expect(screen.getByTestId('managed-avatar-tip')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('prioritizes uid over managed flag', () => {
      renderCell({ uid: 'user-123', managed: true });

      expect(screen.getByTestId('user-avatar-tip')).toBeInTheDocument();
      expect(screen.queryByTestId('managed-avatar-tip')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls toggle with display value when avatar is clicked', () => {
      const toggle = jest.fn();
      useQueryFilter.mockReturnValue({ toggle });
      // Mock resolver to return a username for the UID.
      mockCreatedByResolver.getDisplay.mockReturnValue('john.doe');

      renderCell({ uid: 'user-123' });

      const button = screen.getByTestId('createdByCellButton');
      fireEvent.click(button);

      // Uses display value (username) for filtering to keep search bar user-friendly.
      // The resolver deduplicates by canonical (UID) internally.
      expect(toggle).toHaveBeenCalledWith('john.doe');
    });

    it('does not call toggle when uid is not provided', () => {
      const toggle = jest.fn();
      useQueryFilter.mockReturnValue({ toggle });

      renderCell({ managed: true });

      // Managed content has no button to click.
      expect(screen.queryByTestId('createdByCellButton')).not.toBeInTheDocument();
      expect(toggle).not.toHaveBeenCalled();
    });
  });

  describe('memoization', () => {
    it('does not re-render when props are equal', () => {
      const { rerender } = renderCell({ uid: 'user-123', managed: false, entityName: 'dashboard' });

      // Re-render with same props.
      rerender(
        <EuiProvider colorMode="light">
          <CreatedByCell uid="user-123" managed={false} entityName="dashboard" />
        </EuiProvider>
      );

      // Component should be memoized, no new renders.
      expect(screen.getByTestId('user-avatar-tip')).toBeInTheDocument();
    });
  });
});
