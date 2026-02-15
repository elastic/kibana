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
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
  type SortField,
} from '@kbn/content-list-provider';
import type { Query } from '@elastic/eui';
import { SortRenderer } from './sort_renderer';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: {
    sortFields?: SortField[];
    sortOptions?: Array<{ label: string; field: string; direction: 'asc' | 'desc' }>;
    initialSort?: { field: string; direction: 'asc' | 'desc' };
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { sortFields, sortOptions, initialSort } = options ?? {};

    const sorting = sortFields
      ? { fields: sortFields, initialSort }
      : sortOptions
      ? { options: sortOptions, initialSort }
      : initialSort
      ? { initialSort }
      : undefined;

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        features={sorting ? { sorting } : undefined}
      >
        {children}
      </ContentListProvider>
    );
  };

// The `SortRenderer` receives `query` and `onChange` from `EuiSearchBar`.
const mockQuery = {} as Query;

describe('SortRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with the default data-test-subj', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });

    it('applies custom data-test-subj', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} data-test-subj="my-sort" />
        </Wrapper>
      );

      expect(screen.getByTestId('my-sort')).toBeInTheDocument();
    });

    it('renders a sort button', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // The button should show the current sort label (A-Z by default).
      expect(screen.getByTestId('contentListSortRenderer')).toBeInTheDocument();
    });
  });

  describe('default sort options', () => {
    it('shows default title sort options when no sorting config is provided', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // Open the popover.
      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // "A-Z" appears in both the button label and the selectable option.
      expect(screen.getAllByText('A-Z').length).toBeGreaterThanOrEqual(1);
      // "Z-A" should appear in the selectable list.
      expect(screen.getByRole('option', { name: /Z-A/i })).toBeInTheDocument();
    });

    it('selects the current sort option by default (A-Z)', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // The button label should reflect the current sort.
      const button = screen.getByTestId('contentListSortRenderer');
      expect(button).toHaveTextContent('A-Z');
    });
  });

  describe('custom sort fields', () => {
    it('generates options from provided sort fields with explicit labels', () => {
      const Wrapper = createWrapper({
        sortFields: [
          { field: 'title', name: 'Name' },
          {
            field: 'updatedAt',
            name: 'Last updated',
            ascLabel: 'Old-Recent',
            descLabel: 'Recent-Old',
          },
        ],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // Open the popover.
      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // Title/name fields should generate A-Z/Z-A options.
      expect(screen.getByRole('option', { name: /A-Z/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Z-A/i })).toBeInTheDocument();
      // Fields with explicit labels should use those labels.
      expect(screen.getByRole('option', { name: /Old-Recent/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Recent-Old/i })).toBeInTheDocument();
    });

    it('uses custom labels when provided on sort fields', () => {
      const Wrapper = createWrapper({
        sortFields: [
          {
            field: 'status',
            name: 'Status',
            ascLabel: 'Draft → Active',
            descLabel: 'Active → Draft',
          },
        ],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      expect(screen.getByText('Draft → Active')).toBeInTheDocument();
      expect(screen.getByText('Active → Draft')).toBeInTheDocument();
    });

    it('uses date labels for date-like fields when labels are not provided', () => {
      const Wrapper = createWrapper({
        sortFields: [{ field: 'updatedAt', name: 'Last updated' }],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // Date-like fields get date-specific labels.
      expect(screen.getByRole('option', { name: /Oldest first/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Newest first/i })).toBeInTheDocument();
      // No generic ascending/descending labels.
      expect(
        screen.queryByRole('option', { name: /Last updated \(ascending\)/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: /Last updated \(descending\)/i })
      ).not.toBeInTheDocument();
    });

    it('uses generic labels for non-title, non-date fields', () => {
      const Wrapper = createWrapper({
        sortFields: [{ field: 'status', name: 'Status' }],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // Non-title, non-date fields get generic labels.
      expect(screen.getByRole('option', { name: /Status \(ascending\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Status \(descending\)/i })).toBeInTheDocument();
    });

    it('does not apply date labels to fields that merely end with lowercase "at"', () => {
      const Wrapper = createWrapper({
        sortFields: [{ field: 'format', name: 'Format' }],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // "format" ends in "at" but is not a date field — should use generic labels.
      expect(screen.getByRole('option', { name: /Format \(ascending\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Format \(descending\)/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Oldest first/i })).not.toBeInTheDocument();
    });
  });

  describe('explicit sort options', () => {
    it('renders explicit sort options when provided', () => {
      const Wrapper = createWrapper({
        sortOptions: [
          { label: 'Newest first', field: 'createdAt', direction: 'desc' },
          { label: 'Oldest first', field: 'createdAt', direction: 'asc' },
        ],
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      expect(screen.getByText('Newest first')).toBeInTheDocument();
      expect(screen.getByText('Oldest first')).toBeInTheDocument();
    });
  });

  describe('sort selection', () => {
    it('updates the button label after selecting a sort option', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // Open the popover and select Z-A.
      fireEvent.click(screen.getByTestId('contentListSortRenderer'));
      fireEvent.click(screen.getByText('Z-A'));

      // The button label should update.
      const button = screen.getByTestId('contentListSortRenderer');
      expect(button).toHaveTextContent('Z-A');
    });

    it('updates the sort state after selecting an option', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // Open the popover.
      fireEvent.click(screen.getByTestId('contentListSortRenderer'));

      // Select Z-A.
      fireEvent.click(screen.getByRole('option', { name: /Z-A/i }));

      // The button label should reflect the new selection.
      const button = screen.getByTestId('contentListSortRenderer');
      expect(button).toHaveTextContent('Z-A');
    });
  });

  describe('initial sort', () => {
    it('reflects the initial sort from provider config', () => {
      const Wrapper = createWrapper({
        sortFields: [
          { field: 'title', name: 'Name' },
          {
            field: 'updatedAt',
            name: 'Last updated',
            ascLabel: 'Old-Recent',
            descLabel: 'Recent-Old',
          },
        ],
        initialSort: { field: 'updatedAt', direction: 'desc' },
      });
      render(
        <Wrapper>
          <SortRenderer query={mockQuery} />
        </Wrapper>
      );

      // Button label should reflect the initial sort.
      const button = screen.getByTestId('contentListSortRenderer');
      expect(button).toHaveTextContent('Recent-Old');
    });
  });
});
