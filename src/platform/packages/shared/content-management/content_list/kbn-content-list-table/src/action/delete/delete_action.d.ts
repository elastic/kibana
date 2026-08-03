import type { DeleteActionProps, ActionOutput, ActionBuilderContext } from '../types';
/**
 * Build a `DefaultItemAction` for the delete action preset.
 *
 * Returns `undefined` when read-only or when `onBulkAction` is not configured.
 * The `onClick` handler opens the table-level delete confirmation modal.
 *
 * Composes `enabled` and `description` with `actions.delete.restriction` to
 * disable the icon and surface the reason when restricted.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Delete` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the delete action, or `undefined` to skip.
 */
export declare const buildDeleteAction: (attributes: DeleteActionProps, context: ActionBuilderContext) => ActionOutput | undefined;
