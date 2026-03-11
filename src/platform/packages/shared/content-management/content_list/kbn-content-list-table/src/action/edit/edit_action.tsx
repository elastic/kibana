/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EditActionProps, ActionOutput, ActionBuilderContext } from '../types';

/** Default i18n-translated label for the edit action. */
const DEFAULT_EDIT_LABEL = i18n.translate('contentManagement.contentList.table.action.edit.label', {
  defaultMessage: 'Edit',
});

/** Default i18n-translated description for the edit action. */
const DEFAULT_EDIT_DESCRIPTION = i18n.translate(
  'contentManagement.contentList.table.action.edit.description',
  { defaultMessage: 'Edit this item' }
);

/**
 * Build a `DefaultItemAction` for the edit action preset.
 *
 * Returns `undefined` when:
 * - The table is in read-only mode.
 * - No edit handler (`onEdit`) or edit URL generator (`getEditUrl`) is configured.
 *
 * When both `getEditUrl` and `onEdit` are provided, the action renders as a link
 * (`href`) and also fires `onEdit` on click. This enables composable behavior
 * such as navigating to an edit page while also tracking analytics.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Edit` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the edit action, or `undefined` to skip.
 */
export const buildEditAction = (
  attributes: EditActionProps,
  context: ActionBuilderContext
): ActionOutput | undefined => {
  const { itemConfig, isReadOnly } = context;

  if (isReadOnly || !itemConfig) {
    return undefined;
  }

  const { getEditUrl, onEdit } = itemConfig;

  if (!getEditUrl && !onEdit) {
    return undefined;
  }

  const label = attributes.label ?? DEFAULT_EDIT_LABEL;

  return {
    name: label,
    description: DEFAULT_EDIT_DESCRIPTION,
    icon: 'pencil',
    type: 'icon',
    isPrimary: true,
    ...(getEditUrl && { href: (item) => getEditUrl(item) }),
    ...(onEdit && { onClick: (item) => onEdit(item) }),
    'data-test-subj': 'content-list-table-action-edit',
  };
};
