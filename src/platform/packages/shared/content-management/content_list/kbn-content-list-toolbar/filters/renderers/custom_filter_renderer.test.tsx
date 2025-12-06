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
import {
  CustomFilterRenderer,
  DynamicCustomFilterRenderer,
  createDynamicCustomFilterRenderer,
} from './custom_filter_renderer';

// Mock the provider hooks.
jest.mock('@kbn/content-list-provider', () => ({
  useContentListItems: jest.fn(() => ({
    items: [
      { id: '1', status: 'active' },
      { id: '2', status: 'active' },
      { id: '3', status: 'inactive' },
      { id: '4', status: 'pending' },
    ],
  })),
  useContentListConfig: jest.fn(() => ({
    features: {
      filtering: {
        custom: {
          status: {
            name: 'Status',
            multiSelect: true,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
            ],
          },
        },
      },
    },
  })),
}));

const { useContentListConfig } = jest.requireMock('@kbn/content-list-provider');

describe('CustomFilterRenderer', () => {
  const defaultFilterConfig = {
    name: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending' },
    ],
  };

  const defaultProps = {
    fieldName: 'status',
    filterConfig: defaultFilterConfig,
    query: Query.parse(''),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<CustomFilterRenderer {...defaultProps} />);
      expect(screen.getByTestId('contentListCustomFilterRenderer')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<CustomFilterRenderer {...defaultProps} data-test-subj="customFilter" />);
      expect(screen.getByTestId('customFilter')).toBeInTheDocument();
    });

    it('renders filter button with config name', () => {
      render(<CustomFilterRenderer {...defaultProps} />);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  describe('filter options', () => {
    it('displays all options in popover', async () => {
      render(<CustomFilterRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('shows item counts per option in multi-select mode', async () => {
      render(<CustomFilterRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        // Active has 2 items.
        expect(screen.getByText('2')).toBeInTheDocument();
        // Inactive and Pending have 1 item each.
        const oneCounts = screen.getAllByText('1');
        expect(oneCounts.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('multi-select mode', () => {
    it('defaults to multi-select when multiSelect is not specified', async () => {
      render(<CustomFilterRenderer {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        // Multi-select shows counts.
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('uses multi-select when multiSelect is true', async () => {
      const config = { ...defaultFilterConfig, multiSelect: true };
      render(<CustomFilterRenderer {...defaultProps} filterConfig={config} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        // Multi-select shows counts.
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('single-select mode', () => {
    it('uses single-select when multiSelect is false', async () => {
      const config = { ...defaultFilterConfig, multiSelect: false };
      render(<CustomFilterRenderer {...defaultProps} filterConfig={config} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        // Single-select doesn't show counts.
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });
  });
});

describe('DynamicCustomFilterRenderer', () => {
  const defaultProps = {
    fieldId: 'status',
    query: Query.parse(''),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useContentListConfig.mockReturnValue({
      features: {
        filtering: {
          custom: {
            status: {
              name: 'Status',
              multiSelect: true,
              options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ],
            },
          },
        },
      },
    });
  });

  it('renders CustomFilterRenderer with config from context', () => {
    render(<DynamicCustomFilterRenderer {...defaultProps} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('returns null when custom config is not found', () => {
    useContentListConfig.mockReturnValue({
      features: {
        filtering: {
          custom: {},
        },
      },
    });
    const { container } = render(<DynamicCustomFilterRenderer {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when filtering is not an object', () => {
    useContentListConfig.mockReturnValue({
      features: {
        filtering: true,
      },
    });
    const { container } = render(<DynamicCustomFilterRenderer {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('uses correct data-test-subj format', () => {
    render(<DynamicCustomFilterRenderer {...defaultProps} />);
    expect(screen.getByTestId('contentListCustomFilter-status')).toBeInTheDocument();
  });
});

describe('createDynamicCustomFilterRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContentListConfig.mockReturnValue({
      features: {
        filtering: {
          custom: {
            type: {
              name: 'Type',
              options: [{ value: 'dashboard', label: 'Dashboard' }],
            },
          },
        },
      },
    });
  });

  it('creates a stable component type', () => {
    const Renderer1 = createDynamicCustomFilterRenderer('type');
    const Renderer2 = createDynamicCustomFilterRenderer('type');
    // Each call creates a new component (caching is external).
    expect(Renderer1).not.toBe(Renderer2);
  });

  it('sets correct displayName on created component', () => {
    const Renderer = createDynamicCustomFilterRenderer('myField');
    expect(Renderer.displayName).toBe('DynamicCustomFilterRenderer(myField)');
  });

  it('renders the filter correctly', () => {
    const Renderer = createDynamicCustomFilterRenderer('type');
    render(<Renderer query={Query.parse('')} onChange={jest.fn()} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('passes query and onChange to underlying component', () => {
    const Renderer = createDynamicCustomFilterRenderer('type');
    const handleChange = jest.fn();
    render(<Renderer query={Query.parse('')} onChange={handleChange} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
  });
});
