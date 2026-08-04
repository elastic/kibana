import type { EditActionProps, ActionOutput, ActionBuilderContext } from '../types';
/**
 * Build a `DefaultItemAction` for the edit action preset.
 *
 * Returns `undefined` when read-only or when neither
 * `actions.edit.onItemAction` nor `actions.edit.getItemActionHref` is
 * configured. Composes `enabled` and `description` with
 * `actions.edit.restriction` to disable the icon and surface the reason
 * when restricted.
 *
 * When `getItemActionHref` is configured the row icon renders as an
 * `<a href>` link (with native right-click / middle-click open-in-new-tab
 * affordances). Otherwise it renders as a button calling `onItemAction`.
 *
 * @param attributes - The declarative attributes from the parsed `Action.Edit` element.
 * @param context - Builder context with provider configuration.
 * @returns A `DefaultItemAction<ContentListItem>` for the edit action, or `undefined` to skip.
 */
export declare const buildEditAction: (attributes: EditActionProps, context: ActionBuilderContext) => ActionOutput | undefined;
