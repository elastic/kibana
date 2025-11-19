/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useContentListItems,
  useContentListSearch,
  useContentListFilters,
  useContentListSort,
  useContentListPagination,
  useContentListSelection,
} from '.';
import { createMockItems, createMockFindItems, renderWithProvider } from './test_utils';

describe('ContentListProvider Integration', () => {
  describe('parseSearchQuery integration', () => {
    it('should parse tag queries and extract tag IDs', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
        { id: 'tag-2', name: 'Urgent', color: '#00FF00', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="tags-include">{filters.tags?.include.join(',') || 'none'}</div>
            <div data-test-subj="tags-exclude">{filters.tags?.exclude.join(',') || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'tag:Important test');

      await waitFor(() => {
        expect(screen.getByTestId('tags-include')).toHaveTextContent('tag-1');
      });
    });

    it('should handle tag exclusion queries', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Archived', color: '#FF0000', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="tags-exclude">{filters.tags?.exclude.join(',') || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, '-tag:Archived test');

      await waitFor(() => {
        expect(screen.getByTestId('tags-exclude')).toHaveTextContent('tag-1');
      });
    });

    it('should handle multiple tags in OR clause', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
        { id: 'tag-2', name: 'Urgent', color: '#00FF00', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="tags-include">
              {filters.tags?.include.sort().join(',') || 'none'}
            </div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'tag:(Important OR Urgent) test');

      await waitFor(() => {
        const tagsText = screen.getByTestId('tags-include').textContent;
        expect(tagsText).toContain('tag-1');
        expect(tagsText).toContain('tag-2');
      });
    });

    it('should ignore invalid tag names', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Valid', color: '#FF0000', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="tags-include">{filters.tags?.include.join(',') || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'tag:InvalidTag test');

      await waitFor(() => {
        expect(screen.getByTestId('tags-include')).toHaveTextContent('none');
      });
    });

    it('should return original query when no tags are resolved', async () => {
      const mockTags: Array<{
        id: string;
        name: string;
        color: string;
        description: string;
        managed: boolean;
      }> = [];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="search-text">{filters.search || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'tag:NonExistent test query');

      await waitFor(() => {
        // When no tags are resolved, original query should be used
        expect(screen.getByTestId('search-text').textContent).toContain('test query');
      });
    });

    it('should parse is:starred from query text when tags service is enabled', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="starred-only">
              {filters.starredOnly ? 'starred' : 'not-starred'}
            </div>
            <div data-test-subj="search-text">{filters.search || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'is:starred test query');

      await waitFor(() => {
        expect(screen.getByTestId('starred-only')).toHaveTextContent('starred');
        expect(screen.getByTestId('search-text')).toHaveTextContent('test query');
      });
    });

    it('should parse is:starred combined with tag filter', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
      ];
      const getTagList = jest.fn(() => mockTags);
      const mockItems = createMockItems(10);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { queryText, setSearch } = useContentListSearch();
        const { filters } = useContentListFilters();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="starred-only">
              {filters.starredOnly ? 'starred' : 'not-starred'}
            </div>
            <div data-test-subj="tags-include">{filters.tags?.include.join(',') || 'none'}</div>
            <div data-test-subj="search-text">{filters.search || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          services: {
            tags: {
              getTagList,
            },
          },
        },
      });

      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'tag:Important is:starred dashboard');

      await waitFor(() => {
        expect(screen.getByTestId('starred-only')).toHaveTextContent('starred');
        expect(screen.getByTestId('tags-include')).toHaveTextContent('tag-1');
        expect(screen.getByTestId('search-text')).toHaveTextContent('dashboard');
      });
    });
  });

  describe('Search workflow', () => {
    it('should filter items on search and reset page', async () => {
      const mockItems = createMockItems(50);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, isLoading } = useContentListItems();
        const { queryText, setSearch } = useContentListSearch();
        const { index } = useContentListPagination();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div data-test-subj="loading">{isLoading ? 'Loading' : 'Ready'}</div>
            <div data-test-subj="page-index">{index}</div>
            <div data-test-subj="items-count">{items.length}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 10 } },
        },
      });

      // Type search query
      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'Item 1');

      // Wait for search to trigger
      await waitFor(() => {
        // Page should reset to 0 when searching
        expect(screen.getByTestId('page-index')).toHaveTextContent('0');
      });
    });
  });

  describe('Filter workflow', () => {
    it('should filter items and reset page', async () => {
      const mockItems = createMockItems(30);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { filters, setFilters } = useContentListFilters();
        const { index, setPage } = useContentListPagination();

        return (
          <div>
            <button data-test-subj="go-to-page-2" onClick={() => setPage(2, 10)}>
              Go to page 2
            </button>
            <button
              data-test-subj="apply-filter"
              onClick={() => setFilters({ tags: { include: ['tag-1'], exclude: [] } })}
            >
              Filter by tag-1
            </button>
            <div data-test-subj="page-index">{index}</div>
            <div data-test-subj="active-tags">{filters.tags?.include.join(',') || 'none'}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      // Go to page 2
      const goToPage2Btn = screen.getByTestId('go-to-page-2');
      await userEvent.click(goToPage2Btn);

      await waitFor(() => {
        expect(screen.getByTestId('page-index')).toHaveTextContent('2');
      });

      // Apply filter
      const filterBtn = screen.getByTestId('apply-filter');
      await userEvent.click(filterBtn);

      await waitFor(() => {
        // Page should reset to 0 when filtering
        expect(screen.getByTestId('page-index')).toHaveTextContent('0');
        expect(screen.getByTestId('active-tags')).toHaveTextContent('tag-1');
      });
    });
  });

  describe('Sort workflow', () => {
    it('should sort items and reset page', async () => {
      const mockItems = createMockItems(40);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { field, direction, setSort } = useContentListSort();
        const { index, setPage } = useContentListPagination();

        return (
          <div>
            <button data-test-subj="go-to-page-3" onClick={() => setPage(3, 10)}>
              Go to page 3
            </button>
            <button data-test-subj="sort-by-updated" onClick={() => setSort('updatedAt', 'desc')}>
              Sort by updated
            </button>
            <div data-test-subj="page-index">{index}</div>
            <div data-test-subj="sort-field">{field}</div>
            <div data-test-subj="sort-direction">{direction}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      // Go to page 3
      const goToPage3Btn = screen.getByTestId('go-to-page-3');
      await userEvent.click(goToPage3Btn);

      await waitFor(() => {
        expect(screen.getByTestId('page-index')).toHaveTextContent('3');
      });

      // Change sort
      const sortBtn = screen.getByTestId('sort-by-updated');
      await userEvent.click(sortBtn);

      await waitFor(() => {
        // Page should reset to 0 when sorting
        expect(screen.getByTestId('page-index')).toHaveTextContent('0');
        expect(screen.getByTestId('sort-field')).toHaveTextContent('updatedAt');
        expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');
      });
    });
  });

  describe('Pagination workflow', () => {
    it('should navigate between pages', async () => {
      const mockItems = createMockItems(50);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { index, size, totalPages, setPage } = useContentListPagination();

        return (
          <div>
            <button
              data-test-subj="prev-page"
              onClick={() => setPage(Math.max(0, index - 1), size)}
              disabled={index === 0}
            >
              Previous
            </button>
            <button
              data-test-subj="next-page"
              onClick={() => setPage(index + 1, size)}
              disabled={index >= totalPages - 1}
            >
              Next
            </button>
            <div data-test-subj="current-page">{index + 1}</div>
            <div data-test-subj="total-pages">{totalPages}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 20 } },
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('total-items')).toHaveTextContent('50');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('3'); // 50 / 20 = 2.5 -> 3
      });

      // Go to next page
      const nextBtn = screen.getByTestId('next-page');
      await userEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('2');
      });

      // Go to next page again
      await userEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('3');
      });

      // Go back
      const prevBtn = screen.getByTestId('prev-page');
      await userEvent.click(prevBtn);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('2');
      });
    });

    it('should handle empty result sets', async () => {
      const mockFindItems = jest.fn(createMockFindItems([]));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { index, totalPages } = useContentListPagination();

        return (
          <div>
            <div data-test-subj="current-page">{index + 1}</div>
            <div data-test-subj="total-pages">{totalPages}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 10 } },
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('total-items')).toHaveTextContent('0');
        expect(screen.getByTestId('items-count')).toHaveTextContent('0');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('0');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      });
    });

    it('should handle last page with fewer items', async () => {
      const mockItems = createMockItems(25);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { index, size, totalPages, setPage } = useContentListPagination();

        return (
          <div>
            <button data-test-subj="go-to-last-page" onClick={() => setPage(totalPages - 1, size)}>
              Go to last page
            </button>
            <div data-test-subj="current-page">{index + 1}</div>
            <div data-test-subj="total-pages">{totalPages}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 10 } },
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('total-items')).toHaveTextContent('25');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('3'); // 25 / 10 = 2.5 -> 3
      });

      // Go to last page
      const lastPageBtn = screen.getByTestId('go-to-last-page');
      await userEvent.click(lastPageBtn);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('3');
        // Last page should have only 5 items (25 - 20)
        expect(screen.getByTestId('items-count')).toHaveTextContent('5');
      });
    });

    it('should reset page when filters reduce results below current page', async () => {
      const mockItems = createMockItems(50);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { setFilters } = useContentListFilters();
        const { index, setPage, totalPages } = useContentListPagination();

        return (
          <div>
            <button data-test-subj="go-to-page-5" onClick={() => setPage(4, 10)}>
              Go to page 5
            </button>
            <button
              data-test-subj="apply-restrictive-filter"
              onClick={() => setFilters({ tags: { include: ['tag-1'], exclude: [] } })}
            >
              Apply restrictive filter
            </button>
            <div data-test-subj="current-page">{index + 1}</div>
            <div data-test-subj="total-pages">{totalPages}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 10 } },
        },
      });

      // Go to page 5
      const page5Btn = screen.getByTestId('go-to-page-5');
      await userEvent.click(page5Btn);

      await waitFor(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('5');
      });

      // Apply filter that reduces results
      const filterBtn = screen.getByTestId('apply-restrictive-filter');
      await userEvent.click(filterBtn);

      await waitFor(() => {
        // Page should reset to 1 when filter is applied
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      });
    });

    it('should change page size and maintain position when possible', async () => {
      const mockItems = createMockItems(100);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { index, size, totalPages, setPage } = useContentListPagination();

        return (
          <div>
            <button data-test-subj="go-to-page-3" onClick={() => setPage(2, size)}>
              Go to page 3
            </button>
            <button data-test-subj="change-page-size" onClick={() => setPage(0, 25)}>
              Change to 25 per page
            </button>
            <div data-test-subj="current-page">{index + 1}</div>
            <div data-test-subj="page-size">{size}</div>
            <div data-test-subj="total-pages">{totalPages}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          features: { pagination: { initialPageSize: 10 } },
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('total-items')).toHaveTextContent('100');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('10'); // 100 / 10
      });

      // Change page size
      const changeSizeBtn = screen.getByTestId('change-page-size');
      await userEvent.click(changeSizeBtn);

      await waitFor(() => {
        expect(screen.getByTestId('page-size')).toHaveTextContent('25');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('4'); // 100 / 25
        expect(screen.getByTestId('items-count')).toHaveTextContent('25');
      });
    });
  });

  describe('Selection workflow', () => {
    it('should select and clear items', async () => {
      const mockItems = createMockItems(10);
      const mockFindItems = createMockFindItems(mockItems);

      function TestComponent() {
        const { items } = useContentListItems();
        const { selectedCount, toggleSelection, selectAll, clearSelection, isSelected } =
          useContentListSelection();

        return (
          <div>
            <button data-test-subj="select-all" onClick={selectAll}>
              Select All
            </button>
            <button data-test-subj="clear-selection" onClick={clearSelection}>
              Clear
            </button>
            <div data-test-subj="selected-count">{selectedCount}</div>
            {items.map((item) => (
              <div key={item.id}>
                <input
                  type="checkbox"
                  data-test-subj={`checkbox-${item.id}`}
                  checked={isSelected(item.id)}
                  onChange={() => toggleSelection(item.id)}
                />
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      // Wait for items to be loaded and rendered
      await waitFor(() => {
        expect(screen.getByTestId('checkbox-item-10')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      });

      // Toggle individual item
      const checkbox1 = screen.getByTestId('checkbox-item-1');
      await userEvent.click(checkbox1);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Select all - wait a tick for React to re-render with items
      await act(async () => {
        const selectAllBtn = screen.getByTestId('select-all');
        await userEvent.click(selectAllBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('10');
      });

      // Clear selection
      const clearBtn = screen.getByTestId('clear-selection');
      await userEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Read-only mode', () => {
    it('should disable selection but allow navigation', async () => {
      const mockItems = createMockItems(30);
      const mockFindItems = createMockFindItems(mockItems);

      function TestComponent() {
        const { items } = useContentListItems();
        const { queryText, setSearch } = useContentListSearch();
        const { toggleSelection, selectedCount } = useContentListSelection();
        const { setPage } = useContentListPagination();

        return (
          <div>
            <input
              data-test-subj="search-input"
              value={queryText}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button data-test-subj="select-item" onClick={() => toggleSelection('item-1')}>
              Select Item 1
            </button>
            <button data-test-subj="go-to-page-2" onClick={() => setPage(1, 10)}>
              Go to Page 2
            </button>
            <div data-test-subj="selected-count">{selectedCount}</div>
            <div data-test-subj="items-count">{items.length}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
          isReadOnly: true,
        },
      });

      // Try to select an item (should not work in read-only mode)
      const selectBtn = screen.getByTestId('select-item');
      await userEvent.click(selectBtn);

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');

      // Search should still work
      const searchInput = screen.getByTestId('search-input');
      await userEvent.type(searchInput, 'Item 1');

      await waitFor(() => {
        expect(searchInput).toHaveValue('Item 1');
      });

      // Pagination should still work
      const pageBtn = screen.getByTestId('go-to-page-2');
      await userEvent.click(pageBtn);

      // Navigation features should work in read-only mode
    });
  });

  describe('Error handling', () => {
    it('should display error on fetch failure', async () => {
      const error = new Error('Failed to fetch items');
      const mockFindItems = jest.fn(async () => {
        throw error;
      });

      function TestComponent() {
        const { items, isLoading, error: fetchError } = useContentListItems();

        return (
          <div>
            <div data-test-subj="loading">{isLoading ? 'Loading' : 'Ready'}</div>
            <div data-test-subj="error">{fetchError?.message || 'No error'}</div>
            <div data-test-subj="items-count">{items.length}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch items');
        expect(screen.getByTestId('items-count')).toHaveTextContent('0');
      });
    });
  });

  describe('Complex workflows', () => {
    it('should handle multiple state changes in sequence', async () => {
      const mockItems = createMockItems(100);
      const mockFindItems = jest.fn(createMockFindItems(mockItems));

      function TestComponent() {
        const { items, totalItems } = useContentListItems();
        const { setSearch } = useContentListSearch();
        const { setFilters } = useContentListFilters();
        const { setSort } = useContentListSort();
        const { index, setPage } = useContentListPagination();

        return (
          <div>
            <button
              data-test-subj="complex-workflow"
              onClick={async () => {
                setSearch('Item 1');
                setFilters({ tags: { include: ['tag-1'], exclude: [] } });
                setSort('updatedAt', 'desc');
                setPage(0, 50);
              }}
            >
              Complex Action
            </button>
            <div data-test-subj="page-index">{index}</div>
            <div data-test-subj="items-count">{items.length}</div>
            <div data-test-subj="total-items">{totalItems}</div>
          </div>
        );
      }

      await renderWithProvider(<TestComponent />, {
        providerOverrides: {
          dataSource: { findItems: mockFindItems },
        },
      });

      const btn = screen.getByTestId('complex-workflow');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockFindItems).toHaveBeenCalled();
      });
    });
  });
});
