/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { InspectActionProps, ActionOutput, ActionBuilderContext } from '../types';

/**
 * Default i18n-translated label for the inspect action.
 * Used as both `name` and `description` (tooltip).
 */
const DEFAULT_INSPECT_LABEL = i18n.translate(
  'contentManagement.contentList.table.action.inspect.label',
  { defaultMessage: 'View details' }
);

/**
 * Build a `DefaultItemAction` for the inspect (view details) action preset.
 *
 * Returns `undefined` when no `actions.inspect.onItemAction` is configured.
 * Composes `enabled` and `description` with `actions.inspect.restriction` to
 * disable the icon and surface the reason when restricted.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Inspect` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the inspect action, or `undefined` to skip.
 */
export const buildInspectAction = (
  attributes: InspectActionProps,
  context: ActionBuilderContext
): ActionOutput | undefined => {
  const inspectConfig = context.itemConfig?.actions?.inspect;
  const onItemAction = inspectConfig?.onItemAction;
  if (!onItemAction) {
    return undefined;
  }

  const label = attributes.label ?? DEFAULT_INSPECT_LABEL;
  const { enabled: consumerEnabled } = attributes;
  const restriction = inspectConfig?.restriction;

  const enabled = (item: ContentListItem): boolean => {
    if (restriction && restriction(item) !== undefined) {
      return false;
    }
    return consumerEnabled ? consumerEnabled(item) : true;
  };

  // EUI surfaces `description` as the icon's tooltip. When a restriction
  // predicate is configured we forward a function so the tooltip can
  // carry the per-item reason; otherwise we keep the static string
  // (preserves EUI's fast-path for static descriptions).
  const description = restriction
    ? (item: ContentListItem): string => restriction(item) ?? DEFAULT_INSPECT_LABEL
    : DEFAULT_INSPECT_LABEL;

  return {
    name: label,
    description,
    icon: 'inspect',
    type: 'icon',
    onClick: (item) => onItemAction(item),
    enabled,
    'data-test-subj': 'content-list-table-action-inspect',
  };
};
