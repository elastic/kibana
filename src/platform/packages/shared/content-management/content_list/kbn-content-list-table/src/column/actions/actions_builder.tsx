/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSkeletonRectangle } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ParsedPart, SkeletonOutput } from '@kbn/content-list-assembly';
import type { ColumnBuilderContext } from '../types';
import { column } from '../part';
import { getColumnLayoutProps, type ColumnLayoutProps } from '../layout';
import { action, type ActionOutput, type ActionBuilderContext } from '../../action';

/** Default i18n-translated column title for the actions column. */
const DEFAULT_ACTIONS_COLUMN_TITLE = i18n.translate(
  'contentManagement.contentList.table.column.actions.title',
  { defaultMessage: 'Actions' }
);

/**
 * EUI renders row actions as `EuiButtonIcon` `size="s"`, which `euiButtonSizeMap`
 * sets to `euiTheme.size.xl` (32px) with an `euiTheme.size.xs` (4px) gap between
 * icons. The cell content adds `euiTheme.size.s` (8px) of padding on each side.
 * The cell also has `flex-wrap: wrap` applied (see EUI's `_table_cell_content.styles`),
 * so any width shortfall causes icons to stack vertically. The formula below
 * sizes the column to fit `N` icons inline plus padding:
 * `xl * N + xs * (N - 1) + s * 2`, which works out to `36N + 12` at the default
 * theme scale.
 *
 * Falls back to the static formula when the theme is not threaded through
 * context (e.g. unit tests that construct contexts inline).
 */
const getActionsColumnDefaultWidth = (
  count: number,
  euiTheme: ColumnBuilderContext['euiTheme']
): string => {
  if (!euiTheme) {
    return `${count * 36 + 12}px`;
  }
  const iconWidth = parseInt(euiTheme.size.xl, 10);
  const iconGap = parseInt(euiTheme.size.xs, 10);
  const cellPadding = parseInt(euiTheme.size.s, 10);
  return `${count * iconWidth + (count - 1) * iconGap + cellPadding * 2}px`;
};

/**
 * Props for the `Column.Actions` preset component.
 *
 * These are the declarative attributes consumers pass in JSX. The actions builder
 * reads them directly from the parsed attributes.
 */
export interface ActionsColumnProps
  extends Pick<ColumnLayoutProps, 'width' | 'minWidth' | 'maxWidth'> {
  /** Custom column title. Defaults to `'Actions'`. */
  columnTitle?: string;
  /**
   * Whether to stick the actions column to the right side during horizontal scroll.
   *
   * @default true
   */
  sticky?: boolean;
  /**
   * Action children.
   *
   * When provided, only the specified actions are rendered in the given order.
   * When omitted, actions are determined automatically from the provider config
   * (e.g., edit is shown if `getEditUrl` or `onEdit` is configured, delete is
   * shown if `onDelete` is configured).
   */
  children?: ReactNode;
}

/**
 * Build default action parts based on the current context.
 *
 * When `Column.Actions` has no children, this function determines which actions
 * to show based on the provider configuration. For example, edit is included
 * when `getEditUrl` or `onEdit` is configured, and delete is included when
 * `onDelete` is configured.
 */
const getDefaultActionParts = (context: ColumnBuilderContext): ParsedPart[] => {
  const parts: ParsedPart[] = [];
  const { itemConfig, isReadOnly } = context;

  // Edit and delete actions are suppressed in read-only mode, but inspect
  // (view details) is always available when the content editor is enabled —
  // matching the existing TableListView behavior where "View details" is
  // shown regardless of read-only state.
  if (!isReadOnly) {
    const hasEdit = itemConfig?.getEditUrl || itemConfig?.onEdit;
    const hasDelete = itemConfig?.onDelete;

    if (hasEdit) {
      parts.push({
        type: 'part',
        part: 'action',
        preset: 'edit',
        instanceId: 'edit',
        attributes: {},
      });
    }

    if (hasDelete) {
      parts.push({
        type: 'part',
        part: 'action',
        preset: 'delete',
        instanceId: 'delete',
        attributes: {},
      });
    }
  }

  if (itemConfig?.onInspect) {
    parts.push({
      type: 'part',
      part: 'action',
      preset: 'inspect',
      instanceId: 'inspect',
      attributes: {},
    });
  }

  return parts;
};

/**
 * Build an `EuiBasicTableColumn` (actions column) from `Column.Actions` declarative attributes.
 *
 * Parses action children to determine which row actions to render. When no children
 * are provided, defaults are inferred from the provider configuration. Returns
 * `undefined` when no actions are available (e.g., read-only mode, no handlers configured).
 *
 * @param attributes - The declarative attributes from the parsed `Column.Actions` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the actions column, or `undefined` to skip.
 */
export const buildActionsColumn = (
  attributes: ActionsColumnProps,
  context: ColumnBuilderContext
): EuiBasicTableColumn<ContentListItem> | undefined => {
  const { children, width, minWidth, maxWidth, columnTitle, sticky = true } = attributes;

  // Parse action children from the Column.Actions element.
  const actionParts = children !== undefined ? action.parseChildren(children) : [];

  // Use explicit children if provided, otherwise determine defaults from context.
  const parts = actionParts.length > 0 ? actionParts : getDefaultActionParts(context);

  if (parts.length === 0) {
    return undefined;
  }

  const actionContext: ActionBuilderContext = context;

  // Resolve each action part into an EUI action definition.
  const actions = parts
    .map((part) => action.resolve(part, actionContext))
    .filter((a): a is ActionOutput => a !== undefined);

  if (actions.length === 0) {
    return undefined;
  }

  const defaultWidth = getActionsColumnDefaultWidth(actions.length, context.euiTheme);

  return {
    name: columnTitle ?? DEFAULT_ACTIONS_COLUMN_TITLE,
    actions,
    ...getColumnLayoutProps({
      width: width ?? defaultWidth,
      minWidth: minWidth ?? width ?? defaultWidth,
      maxWidth,
    }),
    sticky,
    'data-test-subj': 'content-list-table-column-actions',
  };
};

/**
 * Actions column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies the Actions column configuration as React children.
 * Action children control which row actions are displayed and in what order.
 *
 * @example Default actions (inferred from provider config)
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions />
 * </ContentListTable>
 * ```
 *
 * @example Explicit actions
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
/**
 * Build the skeleton for `Column.Actions` — a right-aligned row of small
 * rectangles, one per configured action.
 *
 * Mirrors the real actions column's visual layout so there's no jump when
 * the real row icons fade in. The action count is determined the same way
 * the resolver would determine it (explicit `Action.*` children → their
 * count; otherwise the provider-derived defaults from `itemConfig`).
 *
 * Returned as a `{ node }` escape-hatch because a "row of N shapes" isn't a
 * single `SkeletonDescriptor` variant.
 */
const buildActionsColumnSkeleton = (
  attributes: ActionsColumnProps,
  context: ColumnBuilderContext
): SkeletonOutput => {
  const { children } = attributes;
  const actionParts = children !== undefined ? action.parseChildren(children) : [];

  // Hard-coded fallback when no explicit children were provided. The real
  // resolver may ultimately produce 0 (none configured), 2 (edit + delete),
  // or 3 (edit, delete, inspect) depending on provider configuration — 2 is
  // the most common shape and close enough that the swap is not jarring.
  const count = actionParts.length > 0 ? actionParts.length : 2;

  // Match the rendered footprint of an `EuiButtonIcon size="s"` icon glyph
  // (~`euiTheme.size.l`, 24px). Falls back to a static value when no theme
  // is threaded through context (e.g. unit tests).
  const iconSize = context.euiTheme?.size.l ?? 20;

  return {
    node: (
      <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" alignItems="center" responsive={false}>
        {Array.from({ length: count }, (_unused, idx) => (
          <EuiFlexItem key={idx} grow={false}>
            <EuiSkeletonRectangle isLoading width={iconSize} height={iconSize} borderRadius="s" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
  };
};

export const ActionsColumn = column.createPreset({
  name: 'actions',
  resolve: buildActionsColumn,
  skeleton: buildActionsColumnSkeleton,
});
