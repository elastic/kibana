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
import { CreateButton } from './create_button';

// Mock the provider hook.
const mockOnCreate = jest.fn();
const mockDefaultConfig = {
  entityName: 'dashboard',
  entityNamePlural: 'dashboards',
  isReadOnly: false,
  features: {
    globalActions: {
      onCreate: mockOnCreate,
    },
  },
};

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(() => mockDefaultConfig),
}));

const { useContentListConfig } = jest.requireMock('@kbn/content-list-provider');

describe('CreateButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContentListConfig.mockReturnValue(mockDefaultConfig);
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<CreateButton />);
      expect(screen.getByTestId('contentListCreateButton')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<CreateButton data-test-subj="customCreateButton" />);
      expect(screen.getByTestId('customCreateButton')).toBeInTheDocument();
    });

    it('renders default label with entityName', () => {
      render(<CreateButton />);
      expect(screen.getByText(/Create dashboard/i)).toBeInTheDocument();
    });

    it('renders custom label when provided', () => {
      render(<CreateButton label="New Dashboard" />);
      expect(screen.getByText('New Dashboard')).toBeInTheDocument();
    });

    it('renders with default icon type', () => {
      render(<CreateButton />);
      const button = screen.getByTestId('contentListCreateButton');
      expect(button).toBeInTheDocument();
    });

    it('renders with custom icon type', () => {
      render(<CreateButton iconType="plus" />);
      const button = screen.getByTestId('contentListCreateButton');
      expect(button).toBeInTheDocument();
    });
  });

  describe('behavior', () => {
    it('calls onCreate when clicked', () => {
      render(<CreateButton />);
      const button = screen.getByTestId('contentListCreateButton');
      fireEvent.click(button);
      expect(mockOnCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('conditional rendering', () => {
    it('does not render when onCreate is not configured', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        features: {
          globalActions: undefined,
        },
      });
      render(<CreateButton />);
      expect(screen.queryByTestId('contentListCreateButton')).not.toBeInTheDocument();
    });

    it('does not render when isReadOnly is true', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        isReadOnly: true,
      });
      render(<CreateButton />);
      expect(screen.queryByTestId('contentListCreateButton')).not.toBeInTheDocument();
    });

    it('does not render when globalActions.onCreate is undefined', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        features: {
          globalActions: {
            onCreate: undefined,
          },
        },
      });
      render(<CreateButton />);
      expect(screen.queryByTestId('contentListCreateButton')).not.toBeInTheDocument();
    });
  });
});
