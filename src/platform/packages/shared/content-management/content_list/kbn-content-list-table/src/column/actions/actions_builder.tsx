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
export interface ActionsColumnProps {
  /** Column width (CSS value like `'100px'`). */
  width?: string;
  /** Custom column title. Defaults to `'Actions'`. */
  columnTitle?: string;
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

  if (isReadOnly) {
    return parts;
  }

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
  const { children, width, columnTitle } = attributes;

  // Parse action children from the Column.Actions element.
  const actionParts = children !== undefined ? action.parseChildren(children) : [];

  // Use explicit children if provided, otherwise determine defaults from context.
  const parts = actionParts.length > 0 ? actionParts : getDefaultActionParts(context);

  if (parts.length === 0) {
    return undefined;
  }

  // `ColumnBuilderContext` and `ActionBuilderContext` share the same
  // `BuilderContext` base, so the column context is directly usable as
  // the action context. This will need a mapping step when
  // `ActionBuilderContext` gains action-specific fields.
  const actionContext: ActionBuilderContext = context;

  // Resolve each action part into an EUI action definition.
  const actions = parts
    .map((part) => action.resolve(part, actionContext))
    .filter((a): a is ActionOutput => a !== undefined);

  if (actions.length === 0) {
    return undefined;
  }

  return {
    name: columnTitle ?? DEFAULT_ACTIONS_COLUMN_TITLE,
    actions,
    ...(width && { width }),
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
