/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiBasicTable, useEuiTheme } from '@elastic/eui';
import type { EuiBreakpointSize, EuiThemeComputed } from '@elastic/eui';
import { cssFavoriteHoverWithinEuiTableRow } from '@kbn/content-management-favorites-public';
import {
  useContentListConfig,
  useContentListItems,
  useContentListPagination,
  useDeleteConfirmation,
  type ContentListItem,
} from '@kbn/content-list-provider';
import {
  Column as BaseColumn,
  NameColumn,
  UpdatedAtColumn,
  ActionsColumn,
  StarredColumn,
  CreatedByColumn,
} from './column';
import { Action as BaseAction, EditAction, DeleteAction, InspectAction } from './action';
import { useColumns, useSorting, useSelection } from './hooks';
import { TableSkeleton } from './skeleton/table_skeleton';

/**
 * Props for ContentListTable component.
 */
export interface ContentListTableProps {
  /** Accessible title for the table (used as table caption for screen readers). */
  title: string;
  /** Table layout mode. */
  tableLayout?: 'fixed' | 'auto';
  /** Compressed table style. */
  compressed?: boolean;
  /**
   * Whether to enable horizontal scrolling when columns exceed the container width.
   * Required for sticky columns (e.g. `Column.Actions` with `sticky: true`).
   *
   * @default true
   */
  scrollableInline?: boolean;
  /**
   * Named breakpoint below which the table collapses into responsive cards.
   * Set to `false` to always render as a table, or `true` to always render cards.
   *
   * Content List defaults to `false` because the card layout does not support
   * selection checkboxes, tag badges, star buttons, or action columns.
   *
   * @default false
   */
  responsiveBreakpoint?: EuiBreakpointSize | boolean;
  /**
   * Custom message to display when a search or filter returns zero results.
   * When omitted, `EuiBasicTable` renders its built-in empty row. Has no
   * effect when the whole list is empty; `<ContentList>` owns that state.
   */
  noItemsMessage?: ReactNode;
  /**
   * Column components as children.
   * If no children provided, defaults to Name column.
   */
  children?: ReactNode;
  /**
   * Optional filter function to filter items from the provider.
   * Useful when multiple tables share a single provider but display different subsets.
   *
   * **Important:** This function should be memoized (e.g., with `useCallback`) to prevent
   * unnecessary re-filtering on every render.
   *
   * @example
   * ```tsx
   * const filter = useCallback(
   *   (item: ContentListItem) => item.type === 'dashboard',
   *   []
   * );
   * <ContentListTable filter={filter} />
   * ```
   */
  filter?: (item: ContentListItem) => boolean;
  /** Test subject for testing. */
  'data-test-subj'?: string;
}

/**
 * Get a stable row ID for EuiBasicTable's `itemId` prop.
 *
 * @param id - The item's ID.
 * @returns A stable row ID string.
 */
export const getRowId = (id: string): string => `content-list-table-row-${id}`;

/**
 * Keep sticky cells (e.g. `Column.Actions` with `sticky: true`) in visual sync
 * with the row's interactive backgrounds.
 *
 * EUI paints sticky cells with `--euiTableCellStickyBackgroundColor`
 * (defaulting to `backgroundBasePlain`) so they occlude scrolled-over cells.
 * That solid fill also overrides the row's hover/selected backgrounds, leaving
 * the actions column out of the highlight. We update the CSS variable for each
 * interactive row state so the sticky cell tracks the row's color.
 *
 * Hover uses `transparent` rather than the row token, because EUI's
 * `tableRowBackgroundHover` (`primary100Alpha4`) is a 4% translucent overlay
 * — applying it on both the row and the sticky cell stacks the alpha and
 * darkens the cell. Letting the row's translucent fill bleed through keeps
 * the colors in lockstep. (Hovering during horizontal scroll could briefly
 * leak content under the cell, which is acceptable for a transient state.)
 *
 * Selected states use `tableRowBackgroundSelected` /
 * `tableRowBackgroundSelectedHover` directly because those tokens are opaque
 * (`primary10` / `primary20`) and don't suffer the layering problem.
 */
const cssStickyCellRowStateSync = (euiTheme: EuiThemeComputed) => css`
  .euiTableRow {
    &:hover {
      --euiTableCellStickyBackgroundColor: transparent;
    }
    &.euiTableRow-isSelected {
      --euiTableCellStickyBackgroundColor: ${euiTheme.components.tableRowBackgroundSelected};
      &:hover {
        --euiTableCellStickyBackgroundColor: ${euiTheme.components.tableRowBackgroundSelectedHover};
      }
    }
  }
`;

/**
 * ContentListTable - Table renderer for content listings.
 *
 * Integrates with EUI's EuiBasicTable and ContentListProvider for state management.
 * Supports configurable columns via compound components, row selection with
 * checkboxes, and empty states.
 *
 * Selection checkboxes are automatically added when `features.selection` is enabled
 * (the default). Selection state is managed by the provider and accessible to the
 * toolbar for bulk actions via {@link useContentListSelection}.
 *
 * @example Basic usage (defaults to Name column)
 * ```tsx
 * <ContentListProvider {...config}>
 *   <ContentListTable title="Dashboards" />
 * </ContentListProvider>
 * ```
 *
 * @example With actions column
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable title="My Dashboards">
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 *
 * @example With selection and toolbar
 * ```tsx
 * <ContentListProvider {...config}>
 *   <ContentListToolbar />
 *   <ContentListTable title="Dashboards" />
 * </ContentListProvider>
 * ```
 */
const ContentListTableComponent = ({
  title,
  tableLayout = 'auto',
  compressed = false,
  scrollableInline = true,
  responsiveBreakpoint = false,
  noItemsMessage,
  children,
  filter,
  'data-test-subj': dataTestSubj = 'content-list-table',
}: ContentListTableProps) => {
  const { supports } = useContentListConfig();
  const { euiTheme } = useEuiTheme();
  const { items: rawItems, isLoading, isFetching, hasNoItems, error } = useContentListItems();
  const { pageSize } = useContentListPagination();
  const items = useMemo(() => (filter ? rawItems.filter(filter) : rawItems), [rawItems, filter]);

  const { requestDelete, deleteModal } = useDeleteConfirmation();

  // Add the spacer column on viewports wider than this threshold (px).
  // Uses window.matchMedia so the value is not tied to a named EUI breakpoint.
  const SPACER_BREAKPOINT_PX = 1560;
  const [isAboveXl, setIsAboveXl] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= SPACER_BREAKPOINT_PX
  );
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SPACER_BREAKPOINT_PX}px)`);
    setIsAboveXl(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsAboveXl(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const resolvedColumns = useColumns(children, requestDelete);

  /**
   * A layout-only column appended at > xl to absorb excess horizontal space
   * after the actions column. It has no content, no header label, is not
   * sortable, and carries no width so the browser gives it all leftover slack.
   *
   * ARIA attributes (`aria-hidden`, `role="presentation"`) are applied
   * imperatively via the `tableRef` effect below because EUI's column API does
   * not expose `thProps` / `tdProps`.
   */
  const spacerColumn = useMemo(
    () => ({
      name: '',
      render: () => null,
      'data-test-subj': 'content-list-table-column-spacer',
    }),
    []
  );

  // On wide viewports the name column can comfortably be wider than its
  // default 64em cap. The spacer column still absorbs whatever remains.
  const WIDE_NAME_WIDTH = '90em';

  const basicTableColumns = useMemo(
    () => [
      ...resolvedColumns.map((r) => {
        const col = r.column;
        if (
          isAboveXl &&
          (col as { 'data-test-subj'?: string })['data-test-subj'] ===
            'content-list-table-column-name'
        ) {
          return { ...col, width: WIDE_NAME_WIDTH, maxWidth: WIDE_NAME_WIDTH };
        }
        return col;
      }),
      ...(isAboveXl ? [spacerColumn] : []),
    ],
    [resolvedColumns, isAboveXl, spacerColumn]
  );

  const { sorting, onChange } = useSorting();
  const { selection } = useSelection();

  const tableCss = useMemo(
    () => [
      cssStickyCellRowStateSync(euiTheme),
      ...(supports.starred ? [cssFavoriteHoverWithinEuiTableRow(euiTheme)] : []),
    ],
    [euiTheme, supports.starred]
  );

  /**
   * Mark the spacer column's `<th>` and `<td>` elements as purely
   * presentational so assistive technologies do not announce them as real
   * columns. EUI's column API has no `thProps`/`tdProps`, so we set the
   * attributes imperatively after each render that could add or remove rows.
   *
   * The effect re-runs whenever `isAboveXl` or `items` changes — the two
   * events that add/remove the spacer cells from the DOM.
   */
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tableRef.current || !isAboveXl) return;
    tableRef.current
      .querySelectorAll('[data-test-subj="content-list-table-column-spacer"]')
      .forEach((cell) => {
        cell.setAttribute('aria-hidden', 'true');
        cell.setAttribute('role', 'presentation');
      });
  }, [isAboveXl, items]);

  if (isLoading) {
    return (
      <TableSkeleton
        columns={resolvedColumns}
        hasSelection={!!selection}
        rowCount={pageSize}
        tableLayout={tableLayout}
        compressed={compressed}
      />
    );
  }

  if (hasNoItems) {
    return null;
  }

  return (
    <>
      <div ref={tableRef}>
        <EuiBasicTable
          tableCaption={title}
          columns={basicTableColumns}
          compressed={compressed}
          css={tableCss}
          error={error?.message}
          itemId={(item) => getRowId(item.id)}
          items={items}
          loading={isFetching}
          noItemsMessage={noItemsMessage}
          onChange={onChange}
          sorting={sorting}
          selection={selection}
          scrollableInline={scrollableInline}
          responsiveBreakpoint={responsiveBreakpoint}
          tableLayout={tableLayout}
          data-test-subj={dataTestSubj}
        />
      </div>
      {deleteModal}
    </>
  );
};

// Create Column namespace with sub-components.
export const Column = Object.assign(BaseColumn, {
  Name: NameColumn,
  UpdatedAt: UpdatedAtColumn,
  Actions: ActionsColumn,
  Starred: StarredColumn,
  CreatedBy: CreatedByColumn,
});

// Create Action namespace with sub-components.
export const Action = Object.assign(BaseAction, {
  Edit: EditAction,
  Delete: DeleteAction,
  Inspect: InspectAction,
});

export const ContentListTable = Object.assign(ContentListTableComponent, {
  Column,
  Action,
});
