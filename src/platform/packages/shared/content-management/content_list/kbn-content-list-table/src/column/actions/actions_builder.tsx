/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ParsedPart } from '@kbn/content-list-assembly';
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

  // Each `EuiButtonIcon` (xs) is `euiTheme.size.l` (24px) wide with a 4px
  // inline gap — matching `euiButtonSizeMap`'s `xs.height`. `euiButtonSizeMap`
  // requires a live EUI theme context so we derive the constant here instead.
  // Add 8px for cell padding so adjacent columns with long content do not
  // squeeze the actions column.
  const defaultWidth = `${actions.length * 28 + 8}px`;

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
export const ActionsColumn = column.createPreset({
  name: 'actions',
  resolve: buildActionsColumn,
});
