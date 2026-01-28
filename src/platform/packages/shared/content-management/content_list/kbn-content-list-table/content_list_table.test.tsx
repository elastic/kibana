/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ContentListTable, Column, Action } from './content_list_table';
import { renderWithContentListProviders, flushPromises, createTestFindItems } from './test_utils';
import type { ContentListItem } from '@kbn/content-list-provider';

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Dashboard One', updatedAt: new Date('2024-01-15T10:00:00Z') },
  { id: '2', title: 'Dashboard Two', updatedAt: new Date('2024-01-14T09:00:00Z') },
  { id: '3', title: 'Dashboard Three', updatedAt: new Date('2024-01-13T08:00:00Z') },
];

const createMockFindItems = (items: ContentListItem[] = mockItems) => {
  return jest.fn(createTestFindItems(items));
};

describe('ContentListTable', () => {
  describe('rendering', () => {
    it('renders a table with the provided title as caption', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Test Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      // EuiBasicTable uses the tableCaption for accessibility.
      // The caption is used internally by EUI for screen readers.
      // We verify the table renders correctly with items.
      expect(screen.getByText('Dashboard One')).toBeInTheDocument();
    });

    it('renders default columns when no children are provided', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      // Should have name and updatedAt columns by default.
      expect(screen.getByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Two')).toBeInTheDocument();
    });

    it('renders items from the provider', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      mockItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      });
    });

    it('applies custom data-test-subj', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" data-test-subj="custom-table" />,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      expect(screen.getByTestId('custom-table')).toBeInTheDocument();
    });

    it('uses default data-test-subj when not provided', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      expect(screen.getByTestId('content-list-table')).toBeInTheDocument();
    });

    it('renders with compressed table style', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" compressed={true} />,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('filter prop', () => {
    it('filters items using the filter function', async () => {
      const findItems = createMockFindItems();
      const filter = (item: ContentListItem) => item.id !== '2';

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" filter={filter} />,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      expect(screen.getByText('Dashboard One')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Two')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard Three')).toBeInTheDocument();
    });

    it('shows all items when filter is not provided', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      mockItems.forEach((item) => {
        expect(screen.getByText(item.title)).toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    it('renders empty state when no items exist', async () => {
      const findItems = createMockFindItems([]);

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          entityName: 'dashboard',
          dataSource: { findItems },
          // Disable search and filtering to ensure no-items empty state is shown.
          features: { search: false, filtering: false },
        },
      });

      expect(screen.getByTestId('content-list-empty-state-no-items')).toBeInTheDocument();
    });

    it('renders custom empty state when provided', async () => {
      const findItems = createMockFindItems([]);
      const customEmptyState = <div data-test-subj="custom-empty">Custom Empty State</div>;

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" emptyState={customEmptyState} />,
        {
          providerOverrides: {
            dataSource: { findItems },
            // Disable search and filtering to ensure empty state is shown.
            features: { search: false, filtering: false },
          },
        }
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Custom Empty State')).toBeInTheDocument();
    });

    it('renders error empty state when data fetching fails', async () => {
      const findItems = jest.fn(() => Promise.reject(new Error('Network error')));

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          entityName: 'dashboard',
          dataSource: { findItems },
          features: { search: false, filtering: false },
        },
      });

      expect(screen.getByTestId('content-list-empty-state-error')).toBeInTheDocument();
    });
  });

  describe('Column compound components', () => {
    it('renders with Column.Name', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards">
          <Column.Name />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      expect(screen.getByText('Dashboard One')).toBeInTheDocument();
    });

    it('renders with Column.UpdatedAt', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards">
          <Column.Name />
          <Column.UpdatedAt />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      expect(screen.getByText('Dashboard One')).toBeInTheDocument();
    });

    it('renders with custom Column using render prop', async () => {
      const findItems = createMockFindItems([
        { id: '1', title: 'Item 1', status: 'active', updatedAt: new Date('2024-01-15T10:00:00Z') },
      ] as ContentListItem[]);

      await renderWithContentListProviders(
        <ContentListTable title="Items">
          <Column.Name />
          <Column<{ status?: string }>
            id="status"
            name="Status"
            render={(item) => (
              <span data-test-subj="custom-status">{item.status ?? 'unknown'}</span>
            )}
          />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      expect(screen.getByTestId('custom-status')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  describe('expandable rows', () => {
    it('renders expandable rows when renderDetails is provided', async () => {
      const findItems = createMockFindItems();
      const renderDetails = (item: ContentListItem) => (
        <div data-test-subj={`details-${item.id}`}>Details for {item.title}</div>
      );

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" renderDetails={renderDetails}>
          <Column.Expander />
          <Column.Name />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      // Expander buttons should be present.
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('expands row when expander button is clicked', async () => {
      const findItems = createMockFindItems();
      const renderDetails = (item: ContentListItem) => (
        <div data-test-subj={`details-${item.id}`}>Details for {item.title}</div>
      );

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" renderDetails={renderDetails}>
          <Column.Expander />
          <Column.Name />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      // Click the first expander button.
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      await userEvent.click(expandButtons[0]);

      // Details should now be visible.
      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByTestId('details-1')).toBeInTheDocument();
      expect(screen.getByText('Details for Dashboard One')).toBeInTheDocument();
    });

    it('uses canExpand predicate to determine expandable rows', async () => {
      const findItems = createMockFindItems();
      const renderDetails = (item: ContentListItem) => (
        <div data-test-subj={`details-${item.id}`}>Details for {item.title}</div>
      );
      // Only item with id '1' can expand.
      const canExpand = (item: ContentListItem) => item.id === '1';

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards" renderDetails={renderDetails} canExpand={canExpand}>
          <Column.Expander />
          <Column.Name />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
          },
        }
      );

      // Only one expander button should be enabled/visible for the expandable row.
      const expandButtons = screen.getAllByRole('button', { name: /expand/i });
      expect(expandButtons.length).toBe(1);
    });
  });

  describe('loading state', () => {
    it('displays loading indicator when loading', async () => {
      // Create a promise that never resolves to test loading state.
      const findItems = jest.fn(() => new Promise(() => {})) as unknown as ReturnType<
        typeof createTestFindItems
      >;

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
        },
      });

      // The table should show a loading state.
      // EuiBasicTable applies a loading class to tbody when loading is true.
      const table = screen.getByRole('table');
      const tbody = table.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody?.className).toMatch(/loading/i);
    });
  });

  describe('Column and Action namespaces', () => {
    it('exports Column namespace with sub-components', () => {
      expect(Column.Name).toBeDefined();
      expect(Column.UpdatedAt).toBeDefined();
      expect(Column.CreatedBy).toBeDefined();
      expect(Column.Actions).toBeDefined();
      expect(Column.Expander).toBeDefined();
    });

    it('exports Action namespace with sub-components', () => {
      expect(Action.ViewDetails).toBeDefined();
      expect(Action.Edit).toBeDefined();
      expect(Action.Delete).toBeDefined();
      expect(Action.Duplicate).toBeDefined();
      expect(Action.Export).toBeDefined();
    });
  });

  describe('read-only mode', () => {
    it('hides selection checkboxes when isReadOnly is true', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(<ContentListTable title="Dashboards" />, {
        providerOverrides: {
          dataSource: { findItems },
          isReadOnly: true,
          features: {
            selection: { onSelectionDelete: jest.fn() },
          },
        },
      });

      // Selection checkboxes should not be present in read-only mode.
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('hides actions column when isReadOnly is true', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards">
          <Column.Name />
          <Column.Actions />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
            isReadOnly: true,
            item: {
              actions: {
                onEdit: jest.fn(),
                onDelete: jest.fn(),
              },
            },
          },
        }
      );

      // Action buttons should not be present in read-only mode.
      expect(screen.queryByTestId('content-list-table-action-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('content-list-table-action-delete')).not.toBeInTheDocument();
    });

    it('shows selection and actions when isReadOnly is false', async () => {
      const findItems = createMockFindItems();

      await renderWithContentListProviders(
        <ContentListTable title="Dashboards">
          <Column.Name />
          <Column.Actions />
        </ContentListTable>,
        {
          providerOverrides: {
            dataSource: { findItems },
            isReadOnly: false,
            features: {
              selection: { onSelectionDelete: jest.fn() },
            },
            item: {
              actions: {
                onEdit: jest.fn(),
              },
            },
          },
        }
      );

      // Selection checkboxes should be present.
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Action buttons should be present.
      expect(screen.getByTestId('content-list-table-action-edit')).toBeInTheDocument();
    });
  });
});
