/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { table } from '../assembly';
import type {
  EditActionProps,
  DeleteActionProps,
  ActionOutput,
  ActionBuilderContext,
  ActionProps,
} from './types';
import { buildEditAction } from './edit/edit_action';
import { buildDeleteAction } from './delete/delete_action';

/**
 * Preset-to-props mapping for table actions.
 */
export interface ActionPresets {
  edit: EditActionProps;
  delete: DeleteActionProps;
}

/** Part factory for table actions. */
export const action = table.definePart<ActionPresets, ActionOutput, ActionBuilderContext>({
  name: 'action',
});

/**
 * Build a `DefaultItemAction` from a custom (non-preset) action.
 *
 * Registered as the fallback resolver via `createComponent({ resolve })`.
 * Custom actions are identified by `props.id` rather than a preset name.
 */
const resolveCustomAction = (
  {
    id,
    name,
    description,
    icon,
    type: actionType,
    color,
    onClick,
    href,
    enabled,
    available,
    'data-test-subj': dataTestSubj,
  }: ActionProps,
  _context: ActionBuilderContext
): ActionOutput => {
  // Default `type` to `'icon'` when an icon is provided, ensuring the object
  // satisfies EUI's discriminated union (`DefaultItemIconButtonAction` requires
  // both `icon` and `type`). Without this, the conditional spread loses the
  // discriminant and requires a cast.
  const resolvedType = actionType ?? (icon ? 'icon' : undefined);

  // Cast required: EUI's `DefaultItemAction` is a discriminated union keyed on
  // `icon`. The spread-conditional pattern loses the discriminant, but the
  // `resolvedType` guard above ensures the runtime object is always valid.
  return {
    name,
    ...(description && { description }),
    ...(icon && { icon }),
    ...(resolvedType && { type: resolvedType }),
    ...(color && { color }),
    ...(onClick && { onClick }),
    ...(href && { href }),
    ...(enabled && { enabled }),
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
 *     <Action id="duplicate" name="Duplicate" icon="copy" onClick={handleDuplicate} />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export const Action = action.createComponent<ActionProps>({ resolve: resolveCustomAction });
