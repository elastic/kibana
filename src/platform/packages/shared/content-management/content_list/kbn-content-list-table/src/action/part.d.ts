import type { EditActionProps, DeleteActionProps, ContentEditorActionProps, ActionOutput, ActionProps } from './types';
/**
 * Preset-to-props mapping for table actions.
 */
export interface ActionPresets {
    edit: EditActionProps;
    delete: DeleteActionProps;
    contentEditor: ContentEditorActionProps;
}
/** Part factory for table actions. */
export declare const action: import("@kbn/content-list-assembly").PartFactory<ActionPresets, ActionOutput, import("../column/types").BuilderContext>;
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
export declare const EditAction: import("react").FC<EditActionProps>;
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
export declare const DeleteAction: import("react").FC<DeleteActionProps>;
/**
 * Content editor (view details) action preset component for `ContentListTable`.
 *
 * Declarative — renders nothing on its own. Opens the content editor flyout
 * for the row when clicked. The handler is sourced from
 * `features.contentEditor.open` on the provider, not from `item.actions`.
 *
 * Renders the row icon only when `features.contentEditor.open` is set on
 * the provider. When unset (no editor wired), the action skips itself and
 * the table omits the icon entirely — no consumer-side gating is needed.
 *
 * The user-facing label remains `'View details'`. The internal `ContentEditor`
 * naming reflects the action's actual scope (a list-level editor opened
 * against a row), which matters when consumers reach for `Action.ContentEditor`
 * in TypeScript autocomplete.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.ContentEditor />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export declare const ContentEditorAction: import("react").FC<ContentEditorActionProps>;
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
export declare const Action: import("react").FC<ActionProps>;
