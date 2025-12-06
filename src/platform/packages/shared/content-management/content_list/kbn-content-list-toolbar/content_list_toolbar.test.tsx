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
import { ContentListToolbar } from './content_list_toolbar';

// Mock the provider hooks.
const mockSetSearch = jest.fn();
const mockClearSearch = jest.fn();

const mockDefaultConfig = {
  search: { placeholder: 'Search items...' },
  filtering: true,
  isReadOnly: false,
  features: {
    selection: { onSelectionDelete: undefined },
  },
};

const mockDefaultFilterDisplay = {
  hasStarred: true,
  hasSorting: true,
  hasTags: true,
  hasUsers: true,
  hasFilters: true,
};

jest.mock('@kbn/content-list-provider', () => ({
  useContentListConfig: jest.fn(() => mockDefaultConfig),
  useContentListSearch: jest.fn(() => ({
    queryText: '',
    setSearch: mockSetSearch,
    clearSearch: mockClearSearch,
  })),
  useContentListSelection: jest.fn(() => ({
    selectedCount: 0,
    getSelectedItems: jest.fn(() => []),
    clearSelection: jest.fn(),
  })),
  useFilterDisplay: jest.fn(() => mockDefaultFilterDisplay),
}));

// Mock the filter building utilities.
jest.mock('./filters/build_filters', () => ({
  buildSearchBarFilters: jest.fn(() => []),
}));

// Mock the selection actions renderer.
jest.mock('./selection_actions/build_actions', () => ({
  SelectionActionsRenderer: jest.fn(() => null),
}));

// Get the mocked hooks for manipulation in tests.
const { useContentListConfig, useContentListSearch, useContentListSelection, useFilterDisplay } =
  jest.requireMock('@kbn/content-list-provider');
const { buildSearchBarFilters } = jest.requireMock('./filters/build_filters');
const { SelectionActionsRenderer } = jest.requireMock('./selection_actions/build_actions');

describe('ContentListToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useContentListConfig.mockReturnValue(mockDefaultConfig);
    useContentListSearch.mockReturnValue({
      queryText: '',
      setSearch: mockSetSearch,
      clearSearch: mockClearSearch,
    });
    useContentListSelection.mockReturnValue({
      selectedCount: 0,
      getSelectedItems: jest.fn(() => []),
      clearSelection: jest.fn(),
    });
    useFilterDisplay.mockReturnValue(mockDefaultFilterDisplay);
    buildSearchBarFilters.mockReturnValue([]);
    SelectionActionsRenderer.mockReturnValue(null);
  });

  describe('rendering', () => {
    it('renders with default data-test-subj', () => {
      render(<ContentListToolbar />);
      expect(screen.getByTestId('contentListToolbar')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<ContentListToolbar data-test-subj="customToolbar" />);
      expect(screen.getByTestId('customToolbar')).toBeInTheDocument();
    });

    it('renders the search box with default placeholder', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        search: undefined,
      });
      render(<ContentListToolbar />);
      expect(screen.getByTestId('contentListSearchBox')).toBeInTheDocument();
    });

    it('renders the search box with custom placeholder from config', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        search: { placeholder: 'Custom placeholder' },
      });
      render(<ContentListToolbar />);
      const searchBox = screen.getByTestId('contentListSearchBox');
      expect(searchBox).toHaveAttribute('placeholder', 'Custom placeholder');
    });
  });

  describe('search behavior', () => {
    it('calls setSearch when query text is entered', () => {
      render(<ContentListToolbar />);
      const searchInput = screen.getByTestId('contentListSearchBox');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      expect(mockSetSearch).toHaveBeenCalledWith('test query');
    });

    it('calls clearSearch when query text is cleared', () => {
      useContentListSearch.mockReturnValue({
        queryText: 'existing',
        setSearch: mockSetSearch,
        clearSearch: mockClearSearch,
      });
      render(<ContentListToolbar />);
      const searchInput = screen.getByTestId('contentListSearchBox');
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(mockClearSearch).toHaveBeenCalled();
    });
  });

  describe('selection actions', () => {
    it('does not show selection actions when no items are selected', () => {
      useContentListSelection.mockReturnValue({
        selectedCount: 0,
        getSelectedItems: jest.fn(() => []),
        clearSelection: jest.fn(),
      });
      render(<ContentListToolbar />);
      expect(SelectionActionsRenderer).not.toHaveBeenCalledWith(
        expect.objectContaining({ actions: expect.any(Array) }),
        expect.anything()
      );
    });

    it('shows selection actions when items are selected', () => {
      const mockItems = [{ id: '1' }, { id: '2' }];
      useContentListSelection.mockReturnValue({
        selectedCount: 2,
        getSelectedItems: jest.fn(() => mockItems),
        clearSelection: jest.fn(),
      });
      SelectionActionsRenderer.mockReturnValue(
        <div data-test-subj="selection-actions">Actions</div>
      );
      render(<ContentListToolbar />);
      expect(screen.getByTestId('selection-actions')).toBeInTheDocument();
    });

    it('includes delete action when onSelectionDelete is configured', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        features: {
          ...mockDefaultConfig.features,
          selection: { onSelectionDelete: jest.fn() },
        },
      });
      useContentListSelection.mockReturnValue({
        selectedCount: 1,
        getSelectedItems: jest.fn(() => [{ id: '1' }]),
        clearSelection: jest.fn(),
      });
      render(<ContentListToolbar />);
      expect(SelectionActionsRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({ id: 'delete', iconType: 'trash' }),
          ]),
        }),
        expect.anything()
      );
    });
  });

  describe('filters configuration', () => {
    it('uses default filter order when no Filters child is provided', () => {
      render(<ContentListToolbar />);
      expect(buildSearchBarFilters).toHaveBeenCalledWith(
        ['sort', 'tags', 'createdBy', 'starred'],
        expect.objectContaining({
          config: expect.any(Object),
          filterDisplay: expect.any(Object),
        })
      );
    });

    it('parses filter configuration from Filters children', () => {
      const { Filters } = ContentListToolbar;
      render(
        <ContentListToolbar>
          <Filters>
            <Filters.Sort />
            <Filters.Tags />
          </Filters>
        </ContentListToolbar>
      );
      expect(buildSearchBarFilters).toHaveBeenCalledWith(
        ['sort', 'tags'],
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('builds recognized fields for schema including custom filters', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        filtering: {
          custom: {
            status: { name: 'Status', options: [] },
            type: { name: 'Type', options: [] },
          },
        },
      });
      render(<ContentListToolbar />);
      // Verify the search box renders with the custom filter configuration.
      // The schema recognizedFields are internal to EuiSearchBar, so we verify
      // the component renders successfully and the search box is present.
      expect(screen.getByTestId('contentListSearchBox')).toBeInTheDocument();
      // Also verify buildSearchBarFilters was called with the correct context
      // containing the custom filter configuration.
      expect(buildSearchBarFilters).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({
          config: expect.objectContaining({
            filtering: expect.objectContaining({
              custom: expect.objectContaining({
                status: expect.any(Object),
                type: expect.any(Object),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('compound components', () => {
    it('exposes Filters compound component', () => {
      expect(ContentListToolbar.Filters).toBeDefined();
    });

    it('exposes SelectionActions compound component', () => {
      expect(ContentListToolbar.SelectionActions).toBeDefined();
    });

    it('exposes CreateButton compound component', () => {
      expect(ContentListToolbar.CreateButton).toBeDefined();
    });
  });

  describe('create button', () => {
    it('renders create button when globalActions.onCreate is configured', () => {
      const mockOnCreate = jest.fn();
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        entityName: 'dashboard',
        features: {
          ...mockDefaultConfig.features,
          globalActions: {
            onCreate: mockOnCreate,
          },
        },
      });
      render(<ContentListToolbar />);
      expect(screen.getByTestId('contentListCreateButton')).toBeInTheDocument();
    });

    it('does not render create button when globalActions.onCreate is not configured', () => {
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        features: {
          ...mockDefaultConfig.features,
          globalActions: undefined,
        },
      });
      render(<ContentListToolbar />);
      expect(screen.queryByTestId('contentListCreateButton')).not.toBeInTheDocument();
    });

    it('calls onCreate when create button is clicked', () => {
      const mockOnCreate = jest.fn();
      useContentListConfig.mockReturnValue({
        ...mockDefaultConfig,
        entityName: 'dashboard',
        features: {
          ...mockDefaultConfig.features,
          globalActions: {
            onCreate: mockOnCreate,
          },
        },
      });
      render(<ContentListToolbar />);
      const createButton = screen.getByTestId('contentListCreateButton');
      fireEvent.click(createButton);
      expect(mockOnCreate).toHaveBeenCalledTimes(1);
    });
  });
});
