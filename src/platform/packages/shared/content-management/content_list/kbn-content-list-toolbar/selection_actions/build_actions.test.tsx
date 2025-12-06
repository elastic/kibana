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
import {
  SelectionActionsRenderer,
  buildActionsFromConfig,
  type ActionDescriptor,
} from './build_actions';
import type { ActionBuilderContext } from './types';

// Mock the provider hooks.
const mockGetSelectedItems = jest.fn();
const mockClearSelection = jest.fn();
const mockOnSelectionDelete = jest.fn();
const mockOnSelectionExport = jest.fn();

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(() => ({
    isReadOnly: false,
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    features: {
      selection: {
        onSelectionDelete: mockOnSelectionDelete,
        onSelectionExport: mockOnSelectionExport,
      },
    },
  })),
  useContentListSelection: jest.fn(() => ({
    selectedCount: 2,
    getSelectedItems: mockGetSelectedItems,
    clearSelection: mockClearSelection,
  })),
}));

const { useContentListConfig, useContentListSelection } = jest.requireMock(
  '@kbn/content-list-provider'
);

describe('SelectionActionsRenderer', () => {
  const mockItems = [
    { id: '1', title: 'Item 1' },
    { id: '2', title: 'Item 2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSelectedItems.mockReturnValue(mockItems);
    useContentListConfig.mockReturnValue({
      isReadOnly: false,
      entityName: 'dashboard',
      entityNamePlural: 'dashboards',
      features: {
        selection: {
          onSelectionDelete: mockOnSelectionDelete,
          onSelectionExport: mockOnSelectionExport,
        },
      },
    });
    useContentListSelection.mockReturnValue({
      selectedCount: 2,
      getSelectedItems: mockGetSelectedItems,
      clearSelection: mockClearSelection,
    });
  });

  describe('visibility conditions', () => {
    it('returns null when config is read-only', () => {
      useContentListConfig.mockReturnValue({
        isReadOnly: true,
        features: { selection: {} },
      });
      const { container } = render(<SelectionActionsRenderer actions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when no selection is configured', () => {
      useContentListConfig.mockReturnValue({
        isReadOnly: false,
        features: { selection: undefined },
      });
      const { container } = render(<SelectionActionsRenderer actions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when no items are selected', () => {
      useContentListSelection.mockReturnValue({
        selectedCount: 0,
        getSelectedItems: jest.fn(() => []),
        clearSelection: mockClearSelection,
      });
      const { container } = render(<SelectionActionsRenderer actions={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when actions array is empty', () => {
      const { container } = render(<SelectionActionsRenderer actions={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('rendering actions', () => {
    it('renders with default data-test-subj', () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.getByTestId('contentListSelectionActions')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
      render(<SelectionActionsRenderer actions={actions} data-test-subj="customActions" />);
      expect(screen.getByTestId('customActions')).toBeInTheDocument();
    });

    it('renders delete action with count and entity name in label', () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.getByText(/Delete 2 dashboards/)).toBeInTheDocument();
    });

    it('renders export action with count and entity name in label', () => {
      const actions: ActionDescriptor[] = [{ id: 'export', config: {} }];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.getByText(/Export 2 dashboards/)).toBeInTheDocument();
    });

    it('renders custom SelectionAction with label', () => {
      const actions: ActionDescriptor[] = [
        {
          id: 'archive',
          config: {
            id: 'archive',
            label: 'Archive',
            onSelect: jest.fn(),
          },
        },
      ];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });

    it('renders multiple actions', () => {
      const actions: ActionDescriptor[] = [
        { id: 'delete', config: {} },
        { id: 'export', config: {} },
        { id: 'archive', config: { id: 'archive', label: 'Archive', onSelect: jest.fn() } },
      ];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.getByText(/Delete 2 dashboards/)).toBeInTheDocument();
      expect(screen.getByText(/Export 2 dashboards/)).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });
  });

  describe('action visibility', () => {
    it('hides delete action when onSelectionDelete is not configured', () => {
      useContentListConfig.mockReturnValue({
        isReadOnly: false,
        features: {
          selection: { onSelectionDelete: undefined, onSelectionExport: mockOnSelectionExport },
        },
      });
      const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
      const { container } = render(<SelectionActionsRenderer actions={actions} />);
      expect(container.firstChild).toBeNull();
    });

    it('hides export action when onSelectionExport is not configured', () => {
      useContentListConfig.mockReturnValue({
        isReadOnly: false,
        features: {
          selection: { onSelectionDelete: mockOnSelectionDelete, onSelectionExport: undefined },
        },
      });
      const actions: ActionDescriptor[] = [{ id: 'export', config: {} }];
      const { container } = render(<SelectionActionsRenderer actions={actions} />);
      expect(container.firstChild).toBeNull();
    });

    it('hides action when isVisible returns false', () => {
      const actions: ActionDescriptor[] = [
        { id: 'delete', config: { isVisible: () => false } },
        { id: 'export', config: {} },
      ];
      render(<SelectionActionsRenderer actions={actions} />);
      expect(screen.queryByText(/Delete/)).not.toBeInTheDocument();
      expect(screen.getByText(/Export/)).toBeInTheDocument();
    });
  });

  describe('action handlers', () => {
    it('calls onSelectionDelete when delete action is clicked', async () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
      render(<SelectionActionsRenderer actions={actions} />);
      fireEvent.click(screen.getByText(/Delete/));
      await waitFor(() => {
        expect(mockOnSelectionDelete).toHaveBeenCalledWith(mockItems);
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });

    it('calls onSelectionExport when export action is clicked', async () => {
      const actions: ActionDescriptor[] = [{ id: 'export', config: {} }];
      render(<SelectionActionsRenderer actions={actions} />);
      fireEvent.click(screen.getByText(/Export/));
      await waitFor(() => {
        expect(mockOnSelectionExport).toHaveBeenCalledWith(mockItems);
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });

    it('calls custom onSelect when SelectionAction is clicked', async () => {
      const handleSelect = jest.fn();
      const actions: ActionDescriptor[] = [
        { id: 'archive', config: { id: 'archive', label: 'Archive', onSelect: handleSelect } },
      ];
      render(<SelectionActionsRenderer actions={actions} />);
      fireEvent.click(screen.getByText('Archive'));
      await waitFor(() => {
        expect(handleSelect).toHaveBeenCalledWith(mockItems);
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('action enabled state', () => {
    it('disables action when isEnabled returns false', () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: { isEnabled: () => false } }];
      render(<SelectionActionsRenderer actions={actions} />);
      const button = screen.getByText(/Delete/).closest('button');
      expect(button).toBeDisabled();
    });

    it('enables action when isEnabled returns true', () => {
      const actions: ActionDescriptor[] = [{ id: 'delete', config: { isEnabled: () => true } }];
      render(<SelectionActionsRenderer actions={actions} />);
      const button = screen.getByText(/Delete/).closest('button');
      expect(button).not.toBeDisabled();
    });
  });
});

describe('buildActionsFromConfig', () => {
  const mockContext: ActionBuilderContext = {
    selectedCount: 2,
    getSelectedItems: jest.fn(() => [{ id: '1', title: 'Item 1' }]),
    clearSelection: jest.fn(),
    onSelectionDelete: jest.fn(),
    onSelectionExport: jest.fn(),
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
  };

  it('builds delete action', () => {
    const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
    const elements = buildActionsFromConfig(actions, mockContext);
    expect(elements).toHaveLength(1);
    expect(elements[0].key).toBe('delete');
  });

  it('builds export action', () => {
    const actions: ActionDescriptor[] = [{ id: 'export', config: {} }];
    const elements = buildActionsFromConfig(actions, mockContext);
    expect(elements).toHaveLength(1);
    expect(elements[0].key).toBe('export');
  });

  it('builds custom SelectionAction', () => {
    const actions: ActionDescriptor[] = [
      { id: 'archive', config: { id: 'archive', label: 'Archive', onSelect: jest.fn() } },
    ];
    const elements = buildActionsFromConfig(actions, mockContext);
    expect(elements).toHaveLength(1);
    expect(elements[0].key).toBe('archive');
  });

  it('returns empty array when no handler configured for known action', () => {
    const contextWithoutHandler: ActionBuilderContext = {
      ...mockContext,
      onSelectionDelete: undefined,
    };
    const actions: ActionDescriptor[] = [{ id: 'delete', config: {} }];
    const elements = buildActionsFromConfig(actions, contextWithoutHandler);
    expect(elements).toHaveLength(0);
  });

  it('preserves action order', () => {
    const actions: ActionDescriptor[] = [
      { id: 'export', config: {} },
      { id: 'delete', config: {} },
      { id: 'archive', config: { id: 'archive', label: 'Archive', onSelect: jest.fn() } },
    ];
    const elements = buildActionsFromConfig(actions, mockContext);
    expect(elements).toHaveLength(3);
    expect(elements[0].key).toBe('export');
    expect(elements[1].key).toBe('delete');
    expect(elements[2].key).toBe('archive');
  });
});
