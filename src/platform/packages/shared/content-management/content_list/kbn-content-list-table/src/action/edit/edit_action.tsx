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
 * Returns `undefined` when read-only or when neither
 * `actions.edit.onItemAction` nor `actions.edit.getItemActionHref` is
 * configured.
 *
 * When `getItemActionHref` is configured the row icon renders as an
 * `<a href>` link (with native right-click / middle-click open-in-new-tab
 * affordances). Otherwise it renders as a button calling `onItemAction`.
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

  const editConfig = itemConfig.actions?.edit;
  const onItemAction = editConfig?.onItemAction;
  const getItemActionHref = editConfig?.getItemActionHref;

  if (!onItemAction && !getItemActionHref) {
    return undefined;
  }

  const label = attributes.label ?? DEFAULT_EDIT_LABEL;

  return {
    name: label,
    description: DEFAULT_EDIT_DESCRIPTION,
    icon: 'pencil',
    type: 'icon',
    isPrimary: true,
    ...(attributes.enabled && { enabled: attributes.enabled }),
    'data-test-subj': 'content-list-table-action-edit',
    ...(getItemActionHref
      ? { href: (item) => getItemActionHref(item) }
      : { onClick: (item) => onItemAction!(item) }),
  };
};
