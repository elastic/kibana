/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
  type ContentListItemConfig,
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
    item?: ContentListItemConfig;
  }) =>
  ({ children }: { children: React.ReactNode }) => {
    const { findItems = createFindItems(), isReadOnly, getHref, item } = options ?? {};
    const resolvedItem = item ?? (getHref ? { getHref } : undefined);

    return (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
        dataSource={{ findItems }}
        isReadOnly={isReadOnly}
        item={resolvedItem}
      >
        {children}
      </ContentListProvider>
    );
  };

describe('ContentListTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await contentListQueryClient.cancelQueries();
    contentListQueryClient.clear();
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

  describe('hasNoItems — returns null', () => {
    it('returns null when the provider has no items and no query is active', async () => {
      const findItems = createFindItems([]);
      const Wrapper = createWrapper({ findItems });
      const { container } = render(
        <Wrapper>
          <ContentListTable title="Dashboards" data-test-subj="my-table" />
        </Wrapper>
      );

      // Wait until the query has resolved (findItems called) and the component
      // has had a chance to re-render into the null/empty state.
      await waitFor(() => expect(findItems).toHaveBeenCalled());
      await waitFor(() => expect(container.firstChild).toBeNull());

      // The table returns null when hasNoItems — no EuiBasicTable rendered.
      expect(screen.queryByTestId('my-table')).not.toBeInTheDocument();
    });
  });

  describe('hasNoResults — renders the table with the default no-items message', () => {
    it('renders the default `contentListNoResults` empty-state when a search yields no results', async () => {
      const emptyFindItems = createFindItems([]);
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentListProvider
          id="no-results-test"
          labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
          dataSource={{ findItems: emptyFindItems }}
          features={{ search: { initialSearch: 'zzz_no_match' } }}
        >
          {children}
        </ContentListProvider>
      );

      render(
        <Wrapper>
          <ContentListTable title="Dashboards" data-test-subj="results-table" />
        </Wrapper>
      );

      // The table must be present (hasNoResults renders an empty table, not null).
      expect(await screen.findByTestId('results-table')).toBeInTheDocument();
      // `ContentListTable` renders a default empty-state message (with
      // `data-test-subj="contentListNoResults"`) when no custom one is provided.
      expect(await screen.findByTestId('contentListNoResults')).toHaveTextContent('No items found');
    });

    it('renders a custom noItemsMessage prop when provided', async () => {
      const emptyFindItems = createFindItems([]);
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentListProvider
          id="custom-no-results-test"
          labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
          dataSource={{ findItems: emptyFindItems }}
          features={{ search: { initialSearch: 'custom_search' } }}
        >
          {children}
        </ContentListProvider>
      );

      render(
        <Wrapper>
          <ContentListTable
            title="Dashboards"
            noItemsMessage={<div data-test-subj="custom-no-items">Custom no items</div>}
          />
        </Wrapper>
      );

      expect(await screen.findByTestId('custom-no-items')).toBeInTheDocument();
    });
  });

  describe('isLoading — renders skeleton during initial load', () => {
    /**
     * `findItems` that never resolves, keeping `isLoading === true` for the
     * entire test. Uses a unique provider `id` to avoid React Query cache
     * pollution from previous tests (which all use `id="test-list"`).
     */
    const makeLoadingWrapper =
      (providerId: string, initialPageSize = 20) =>
      ({ children }: { children: React.ReactNode }) =>
        (
          <ContentListProvider
            id={providerId}
            labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
            features={{ pagination: { initialPageSize } }}
            dataSource={{
              findItems: jest.fn(
                () => new Promise<{ items: typeof mockItems; total: number }>(() => {})
              ),
            }}
          >
            {children}
          </ContentListProvider>
        );

    it('renders the skeleton (not the real table) while the initial query is in flight', async () => {
      const LoadingWrapper = makeLoadingWrapper('skeleton-smoke-test');

      render(
        <LoadingWrapper>
          <ContentListTable title="Dashboards" data-test-subj="loading-table" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));

      // The real EuiBasicTable must not be visible during loading.
      expect(screen.queryByTestId('loading-table')).toBeNull();
      // The skeleton should be visible instead.
      expect(screen.getByTestId('content-list-table-skeleton')).toBeInTheDocument();
    });

    it('renders one body row per configured page size', async () => {
      const LoadingWrapper = makeLoadingWrapper('skeleton-rows-test', 10);

      render(
        <LoadingWrapper>
          <ContentListTable title="Dashboards" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));
      expect(screen.getAllByTestId('content-list-table-skeleton-row')).toHaveLength(10);
    });

    it('caps skeleton rows at the common page-size maximum', async () => {
      const LoadingWrapper = makeLoadingWrapper('skeleton-capped-rows-test', 100);

      render(
        <LoadingWrapper>
          <ContentListTable title="Dashboards" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));
      expect(screen.getAllByTestId('content-list-table-skeleton-row')).toHaveLength(20);
    });

    it('passes tableLayout through to the skeleton table', async () => {
      const LoadingWrapper = makeLoadingWrapper('skeleton-fixed-layout-test');

      render(
        <LoadingWrapper>
          <ContentListTable title="Dashboards" tableLayout="fixed" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));
      expect(screen.getByTestId('content-list-table-skeleton')).toHaveStyle({
        tableLayout: 'fixed',
      });
    });

    it('renders one skeleton cell per resolved column', async () => {
      const LoadingWrapper = makeLoadingWrapper('skeleton-cols-test');

      render(
        <LoadingWrapper>
          {/* Default columns when no item.actions handlers: Name + UpdatedAt (Actions is omitted). */}
          <ContentListTable title="Dashboards" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));
      const rows = screen.getAllByTestId('content-list-table-skeleton-row');
      rows.forEach((row) => {
        // 2 data columns (Name, UpdatedAt) + 1 checkbox column = 3 cells per row.
        expect(row.querySelectorAll('td')).toHaveLength(3);
      });
    });

    it('skips the checkbox column when selection is disabled', async () => {
      const LoadingWrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentListProvider
          id="skeleton-no-selection-test"
          labels={{ entity: 'dashboard', entityPlural: 'dashboards' }}
          features={{ selection: false }}
          dataSource={{
            findItems: jest.fn(
              () => new Promise<{ items: typeof mockItems; total: number }>(() => {})
            ),
          }}
        >
          {children}
        </ContentListProvider>
      );

      render(
        <LoadingWrapper>
          <ContentListTable title="Dashboards" />
        </LoadingWrapper>
      );

      await new Promise((r) => setTimeout(r, 20));
      const rows = screen.getAllByTestId('content-list-table-skeleton-row');
      rows.forEach((row) => {
        // Without selection: 2 data columns only (Name, UpdatedAt; Actions omitted when no handlers).
        expect(row.querySelectorAll('td')).toHaveLength(2);
      });
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

    it('renders EuiBasicTable (not null) when the filter eliminates all items but hasNoItems is false', async () => {
      // The provider has items, so hasNoItems is false. The client-side filter
      // eliminates everything — the table still renders (empty) not returns null.
      const Wrapper = createWrapper();
      const filter = () => false;
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" data-test-subj="filtered-table" filter={filter} />
        </Wrapper>
      );

      expect(await screen.findByTestId('filtered-table')).toBeInTheDocument();
    });
  });

  describe('trailing spacer (CSS pseudo-cell)', () => {
    /**
     * Excess horizontal space on wide pages is absorbed by a CSS `::after`
     * pseudo-cell on every `<tr>`, not by a real `<td>` column. The visible
     * layout effect can only be observed in a real browser (jsdom doesn't
     * lay out tables), but we can — and should — assert that no phantom
     * DOM column has crept back in. The visual outcome is exercised by the
     * storybook stories under `Content List / Dashboard Listing`.
     */
    it('does not add any phantom <td>/<th> columns to the rendered table', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();

      // Default columns (no children) resolve to Name + UpdatedAt; selection
      // checkboxes add one more cell per row. No trailing spacer column.
      const expectedCellsPerRow = 3;

      const headerRow = screen.getByRole('table').querySelector('thead tr');
      expect(headerRow?.children).toHaveLength(expectedCellsPerRow);

      const bodyRows = screen.getByRole('table').querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(mockItems.length);
      bodyRows.forEach((row) => {
        expect(row.children).toHaveLength(expectedCellsPerRow);
      });
    });

    /**
     * The wide-viewport `Column.Name` upgrade is implemented as a media-query
     * CSS override (`cssWideViewportNameWidth` in `content_list_table.tsx`)
     * rather than a JS column-width swap or a layout-only DOM column. jsdom
     * doesn't lay out tables or evaluate `@media` rules, so we can't observe
     * the visual outcome here — but we *can* assert that:
     *
     * 1. The CSS rule reaches the document (so it actually fires in the
     *    browser).
     * 2. No JS-driven spacer column has crept in alongside it.
     */
    it('emits the wide-viewport Name override as a CSS rule (no JS spacer column)', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <ContentListTable title="Dashboards" />
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();

      // Emotion injects the rule into a `<style>` element in `document.head`.
      // We assert on the joined `cssText` so the rule is detectable regardless
      // of which `<style>` block emotion picks for it.
      const styleSheets = Array.from(document.styleSheets);
      const allRulesText = styleSheets
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            // Cross-origin sheet — ignore.
            return [];
          }
        })
        .map((rule) => rule.cssText)
        .join('\n');

      expect(allRulesText).toMatch(/min-width:\s*2560px/);
      expect(allRulesText).toMatch(/tableHeaderCell_title_/);
      expect(allRulesText).toMatch(/content-list-table-column-name/);

      // Defence-in-depth against a regression that re-introduces the
      // spacer-column approach: assert the layout-only `data-test-subj`
      // never appears in the DOM at any viewport.
      expect(screen.queryByTestId('content-list-table-column-spacer')).not.toBeInTheDocument();
    });

    /**
     * `Column.Actions` ships `min-width: 'max-content'` to keep its row
     * icons (including EUI's auto-collapsed 3-dot overflow trigger) on a
     * single line. That floor only resolves to the unwrapped icon-row
     * width if the cell's flex container is forbidden from wrapping;
     * otherwise EUI's default `flex-wrap: wrap` on
     * `.euiTableCellContent` lets `max-content` collapse to the widest
     * single icon and the column shrinks, stacking the icons vertically.
     *
     * Asserts that the override's selector actually matches body action
     * cells in the DOM — not just that the rule text is present in a
     * stylesheet. A previous incarnation of this override targeted
     * `td[data-test-subj='content-list-table-column-actions']`, but
     * `EuiBasicTable.renderItemActionsCell` never forwards a column's
     * `data-test-subj` to its body `<td>` cells (only the header `<th>`
     * receives it), so the selector matched zero nodes and the rule was
     * dead. The old test only checked that the rule text was emitted,
     * which is why the regression kept reappearing. The cascade itself
     * isn't asserted because jsdom's `getComputedStyle` does not honor
     * specificity reliably; in a real browser our `(0,3,1)` selector
     * wins over EUI's single-class `(0,1,0)` rule.
     */
    it('emits an actions-cell nowrap override whose selector matches body cells', async () => {
      const Wrapper = createWrapper({ item: { actions: { delete: { onBulkAction: jest.fn() } } } });
      const { Column, Action } = ContentListTable;

      render(
        <Wrapper>
          <ContentListTable title="Dashboards">
            <Column.Name />
            <Column.Actions>
              <Action.Delete />
            </Column.Actions>
          </ContentListTable>
        </Wrapper>
      );

      expect(await screen.findByText('Dashboard One')).toBeInTheDocument();

      // Sanity: EUI must be tagging body action `<td>`s with the class our
      // selector anchors on. If this breaks, EUI's class naming changed
      // and the override needs a new anchor.
      const actionCells = document.querySelectorAll(
        'td.euiTableRowCell--hasActions .euiTableCellContent'
      );
      expect(actionCells.length).toBeGreaterThan(0);

      // Find the override in the stylesheet by its content (flex-wrap: nowrap
      // anchored on .euiTableRowCell--hasActions). Scanning by content rather
      // than by hashed Emotion class keeps the assertion stable across
      // refactors of `cssActionsCellNoWrap`.
      const styleSheets = Array.from(document.styleSheets);
      const overrideRule = styleSheets
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .find(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule &&
            rule.selectorText.includes('.euiTableRowCell--hasActions') &&
            /nowrap/.test(rule.style.flexWrap ?? rule.cssText)
        );
      expect(overrideRule).toBeDefined();

      // The crucial assertion the old test missed: the rule's selector must
      // resolve to the same body action cells in the DOM. If a future
      // refactor anchors the selector on something EUI doesn't emit (the
      // original regression), this fails immediately.
      const matchedByOverride = document.querySelectorAll(overrideRule!.selectorText);
      expect(matchedByOverride.length).toBe(actionCells.length);
    });

    it('keeps cell counts in lockstep when consumers add their own columns', async () => {
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

      // 2 consumer columns (Name, Type) + 1 selection checkbox cell.
      const expectedCellsPerRow = 3;

      const headerRow = screen.getByRole('table').querySelector('thead tr');
      expect(headerRow?.children).toHaveLength(expectedCellsPerRow);

      screen
        .getByRole('table')
        .querySelectorAll('tbody tr')
        .forEach((row) => expect(row.children).toHaveLength(expectedCellsPerRow));
    });
  });

  describe('getRowId', () => {
    it('generates stable row IDs', () => {
      expect(getRowId('abc')).toBe('content-list-table-row-abc');
      expect(getRowId('123')).toBe('content-list-table-row-123');
    });
  });
});
