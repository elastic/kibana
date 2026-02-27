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
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { ContentListTable, getRowId } from './content_list_table';

const mockItems = [
  { id: '1', title: 'Dashboard One', description: 'First dashboard' },
  { id: '2', title: 'Dashboard Two', description: 'Second dashboard' },
  { id: '3', title: 'Dashboard Three' },
];

const createFindItems = (items = mockItems, total?: number) =>
  jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items,
      total: total ?? items.length,
    })
  );

const createWrapper =
  (options?: {
    findItems?: jest.Mock;
    isReadOnly?: boolean;
    getHref?: (item: { id: string }) => string;
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { findItems = createFindItems(), isReadOnly, getHref } = options ?? {};

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems }}
        isReadOnly={isReadOnly}
        item={getHref ? { getHref } : undefined}
      >
        {children}
      </ContentListProvider>
    );
  };

describe('ContentListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a table element', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="My Dashboards" />
        </Wrapper>
      );

      // Wait for items to load.
      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      // The `tableCaption` prop renders as a screen-reader-only `<caption>` element.
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders items from the provider', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Two')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Three')).toBeInTheDocument();
    });

    it('uses default data-test-subj when not specified', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByTestId('content-list-table')).toBeInTheDocument();
    });

    it('applies custom data-test-subj', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" data-test-subj="my-custom-table" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByTestId('my-custom-table')).toBeInTheDocument();
    });
  });

  describe('default columns', () => {
    it('renders with the Name column when no children are provided', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      // Name column header should be present.
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('custom columns', () => {
    it('renders with Column.Name sub-component', async () => {
      const { Column } = ContentListTable;
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards">
            <Column.Name columnTitle="Dashboard Name" />
          </ContentListTable>
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Name')).toBeInTheDocument();
    });

    it('renders with generic Column component', async () => {
      const { Column } = ContentListTable;
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards">
            <Column.Name />
            <Column
              id="type"
              name="Type"
              render={(item) => <span>{item.type ?? 'unknown'}</span>}
            />
          </ContentListTable>
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
    });

    it('falls back to default columns when children contain no valid columns', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards">
            <div>Not a column</div>
          </ContentListTable>
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders default empty state when no items', async () => {
      const Wrapper = createWrapper({ findItems: createFindItems([]) });
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByTestId('content-list-table-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No dashboards found')).toBeInTheDocument();
    });

    it('renders custom empty state when provided', async () => {
      const Wrapper = createWrapper({ findItems: createFindItems([]) });
      render(
        <Wrapper>
          <ContentListTable
            title="Dashboards"
            emptyState={<div data-test-subj="custom-empty">Custom empty</div>}
          />
        </Wrapper>
      );

      expect(await screen.findByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.getByText('Custom empty')).toBeInTheDocument();
    });
  });

  describe('filter prop', () => {
    it('filters items using the provided filter function', async () => {
      const Wrapper = createWrapper();
      const filter = (item: { title: string }) => item.title.includes('One');
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" filter={filter} />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Two')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard Three')).not.toBeInTheDocument();
    });

    it('shows empty state when filter eliminates all items', async () => {
      const Wrapper = createWrapper();
      const filter = () => false;
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" filter={filter} />
        </Wrapper>
      );

      expect(await screen.findByTestId('content-list-table-empty-state')).toBeInTheDocument();
    });
  });

  describe('getRowId', () => {
    it('generates stable row IDs', () => {
      expect(getRowId('abc')).toBe('content-list-table-row-abc');
      expect(getRowId('123')).toBe('content-list-table-row-123');
    });
  });
});
