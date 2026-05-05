/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { InspectActionProps, ActionOutput, ActionBuilderContext } from '../types';

/**
 * Default i18n-translated label for the inspect action.
 *
 * Used as both the `name` (visible text / aria-label) and `description`
 * (tooltip) on the underlying `DefaultItemAction` so the action reads as
 * a simple "View details" affordance rather than per-item phrasing like
 * "View {itemTitle} details". Override with the `label` prop on
 * `Action.Inspect` when an item-aware label is desired.
 */
const DEFAULT_INSPECT_LABEL = i18n.translate(
  'contentManagement.contentList.table.action.inspect.label',
  { defaultMessage: 'View details' }
);

/**
 * Build a `DefaultItemAction` for the inspect (view details) action preset.
 *
 * Returns `undefined` when no `onInspect` handler is configured on the item config.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Inspect` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the inspect action, or `undefined` to skip.
 */
export const buildInspectAction = (
  attributes: InspectActionProps,
  context: ActionBuilderContext
): ActionOutput | undefined => {
  if (!context.itemConfig?.onInspect) {
    return undefined;
  }

  const { onInspect } = context.itemConfig;
  const label = attributes.label ?? DEFAULT_INSPECT_LABEL;

  return {
    name: label,
    description: DEFAULT_INSPECT_LABEL,
    icon: 'inspect',
    type: 'icon',
    onClick: (item) => onInspect(item),
    'data-test-subj': 'content-list-table-action-inspect',
  };
};
