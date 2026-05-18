/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '@kbn/content-list-provider';
import { table } from '../assembly';
import type {
  EditActionProps,
  DeleteActionProps,
  InspectActionProps,
  ActionOutput,
  ActionBuilderContext,
  ActionProps,
} from './types';
import { buildEditAction } from './edit/edit_action';
import { buildDeleteAction } from './delete/delete_action';
import { buildInspectAction } from './inspect/inspect_action';

/**
 * Preset-to-props mapping for table actions.
 */
export interface ActionPresets {
  edit: EditActionProps;
  delete: DeleteActionProps;
  inspect: InspectActionProps;
}

/** Part factory for table actions. */
export const action = table.definePart<ActionPresets, ActionOutput, ActionBuilderContext>({
  name: 'action',
});

/**
 * Build a `DefaultItemAction` from a custom (non-preset) action.
 *
 * Custom actions are identified by `props.id` and resolved against
 * `itemConfig.actions?.[id]`:
 *
 * - Uses the configured `onItemAction` (button) or
 *   `getItemActionHref` (link).
 * - Returns `undefined` if neither is configured, skipping the action
 *   to prevent EUI crashes.
 * - Composes `enabled` and `description` with `restriction` to
 *   disable the icon and surface the reason when restricted.
 */
const resolveCustomAction = (
  {
    id,
    name,
    description,
    icon,
    type: actionType,
    color,
    enabled: consumerEnabled,
    available,
    'data-test-subj': dataTestSubj,
  }: ActionProps,
  { itemConfig }: ActionBuilderContext
): ActionOutput | undefined => {
  const actionConfig = itemConfig?.actions?.[id];
  const onItemAction = actionConfig?.onItemAction;
  const getItemActionHref = actionConfig?.getItemActionHref;

  // EUI's `DefaultItemAction` requires either `onClick` or `href` and
  // throws at render otherwise. The absence of either handler in
  // `itemConfig.actions[id]` means there's nothing safe to emit. Skip
  // the action — the table simply won't render an icon for this `id`.
  if (!onItemAction && !getItemActionHref) {
    return undefined;
  }

  // Default `type` to `'icon'` when an icon is provided, ensuring the object
  // satisfies EUI's discriminated union (`DefaultItemIconButtonAction` requires
  // both `icon` and `type`). Without this, the conditional spread loses the
  // discriminant and requires a cast.
  const resolvedType = actionType ?? (icon ? 'icon' : undefined);

  const restriction = actionConfig?.restriction;

  const composedEnabled = restriction
    ? (item: ContentListItem): boolean => {
        if (restriction(item) !== undefined) {
          return false;
        }
        return consumerEnabled ? consumerEnabled(item) : true;
      }
    : consumerEnabled;

  // EUI surfaces `description` as the icon's tooltip. When a restriction
  // is configured we forward a function so the tooltip can carry the
  // per-item reason; otherwise we keep the static string when one was
  // provided (preserves EUI's fast-path for static descriptions).
  //
  // Force the function branch to always return a string (`?? ''`) so the
  // composed value satisfies `ActionOutput['description']`, which is
  // `string | ((item) => string)` and disallows `undefined` in the
  // per-item branch.
  const composedDescription: ActionOutput['description'] | undefined = restriction
    ? (item) => restriction(item) ?? description ?? ''
    : description;

  // Cast required: EUI's `DefaultItemAction` is a discriminated union keyed on
  // `icon`. The spread-conditional pattern loses the discriminant, but the
  // `resolvedType` guard above ensures the runtime object is always valid.
  return {
    name,
    ...(composedDescription !== undefined && { description: composedDescription }),
    ...(icon && { icon }),
    ...(resolvedType && { type: resolvedType }),
    ...(color && { color }),
    ...(getItemActionHref
      ? { href: (item: ContentListItem) => getItemActionHref(item) }
      : { onClick: (item: ContentListItem) => onItemAction!(item) }),
    ...(composedEnabled && { enabled: composedEnabled }),
    ...(available && { available }),
    'data-test-subj': dataTestSubj ?? `content-list-table-action-${id}`,
  } as ActionOutput;
};

/**
 * Edit action preset component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies the edit action within a `Column.Actions` context.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export const EditAction = action.createPreset({ name: 'edit', resolve: buildEditAction });

/**
 * Delete action preset component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies the delete action (with confirmation) within a `Column.Actions` context.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export const DeleteAction = action.createPreset({ name: 'delete', resolve: buildDeleteAction });

/**
 * Inspect action preset component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It specifies the inspect (view details) action within a `Column.Actions` context.
 * Opens the content editor flyout for the selected item.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.Inspect />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export const InspectAction = action.createPreset({ name: 'inspect', resolve: buildInspectAction });

/**
 * Custom action component for `ContentListTable`.
 *
 * Use this for custom row actions not covered by the built-in presets.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action id="duplicate" name="Duplicate" icon="copy" />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export const Action = action.createComponent<ActionProps>({ resolve: resolveCustomAction });
