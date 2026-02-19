/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { EuiTextColor, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DeleteActionProps, ActionOutput, ActionBuilderContext } from '../types';

/**
 * Action label that applies danger color to both the text and the sibling icon
 * in EUI's collapsed overflow menu.
 *
 * EUI renders icons in the overflow menu with `color: inherit`, so they pick up
 * the parent button's text color. This component uses a ref to find the parent
 * `.euiBasicTable__collapsedAction` button and set its color to `textDanger`,
 * making the icon inherit the danger color. In the inline (expanded) context,
 * no matching parent exists and the effect is a no-op.
 *
 * FRAGILE: Depends on EUI internal class `.euiBasicTable__collapsedAction`.
 * `DefaultItemAction.color` only applies to the expanded (inline) view; the
 * collapsed overflow menu ignores it. This workaround will break if EUI
 * renames that class. Tracked upstream: https://github.com/elastic/eui/issues/9384
 */
const DangerActionName = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const { euiTheme } = useEuiTheme();

  useLayoutEffect(() => {
    const button = ref.current?.closest<HTMLElement>('.euiBasicTable__collapsedAction');
    if (button) {
      button.style.color = euiTheme.colors.textDanger;
      return () => {
        button.style.color = '';
      };
    }
  }, [euiTheme.colors.textDanger]);

  return (
    <EuiTextColor color="danger">
      <span ref={ref}>{children}</span>
    </EuiTextColor>
  );
};

/** Default i18n-translated label for the delete action. */
const DEFAULT_DELETE_LABEL = i18n.translate(
  'contentManagement.contentList.table.action.delete.label',
  { defaultMessage: 'Delete' }
);

/** Default i18n-translated description for the delete action. */
const DEFAULT_DELETE_DESCRIPTION = i18n.translate(
  'contentManagement.contentList.table.action.delete.description',
  { defaultMessage: 'Delete this item' }
);

/**
 * Build a `DefaultItemAction` for the delete action preset.
 *
 * Returns `undefined` when:
 * - The table is in read-only mode.
 * - No delete handler (`onDelete`) is configured on the item config.
 *
 * The `onClick` handler is a **no-op stub**. The actual delete flow (confirmation
 * modal, provider-level delete state) will be wired by the Delete Orchestration PR.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Delete` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the delete action, or `undefined` to skip.
 */
export const buildDeleteAction = (
  attributes: DeleteActionProps,
  context: ActionBuilderContext
): ActionOutput | undefined => {
  const { itemConfig, isReadOnly } = context;

  if (isReadOnly) {
    return undefined;
  }
  if (typeof itemConfig?.onDelete !== 'function') {
    return undefined;
  }

  const label = attributes.label ?? DEFAULT_DELETE_LABEL;

  return {
    name: <DangerActionName>{label}</DangerActionName>,
    description: DEFAULT_DELETE_DESCRIPTION,
    icon: 'trash',
    type: 'icon',
    color: 'danger',
    isPrimary: true,
    // TODO: Wire to provider-level delete orchestration.
    onClick: () => {},
    'data-test-subj': 'content-list-table-action-delete',
  };
};
