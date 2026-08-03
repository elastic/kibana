import type { monaco } from '@kbn/code-editor';
/** Shared Monaco layout defaults for workflow YAML surfaces (editor + read-only previews). */
export declare const WORKFLOW_MONACO_LAYOUT_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions;
export declare const WORKFLOW_READ_ONLY_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions;
/**
 * Read-only Monaco for change history preview (single-version view).
 * Disables folding and glyph margin so the gutter width stays stable.
 */
export declare const WORKFLOW_CHANGE_HISTORY_PREVIEW_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions;
/** Read-only editors need explicit squiggle + hover options; Monaco defaults hide them when readOnly. */
export declare const getWorkflowValidationDisplayOptions: (highlightValidationErrors: boolean) => monaco.editor.IEditorOptions;
/** Global editor options applied to diff child editors via `updateOptions`. */
export declare const WORKFLOW_CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS: Pick<monaco.editor.IGlobalEditorOptions, 'tabSize' | 'insertSpaces'>;
/** Shared read-only diff defaults; do not reuse the editable-editor option bundle. */
export declare const WORKFLOW_CHANGE_HISTORY_DIFF_MONACO_BASE_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions;
/** Inline unified diff: no gutter; original pane is hidden via preview CSS. */
export declare const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions;
/** Inline unified diff: modified pane shows line numbers (original is hidden). */
export declare const WORKFLOW_CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS: monaco.editor.IEditorOptions;
/** Side-by-side diff: show line numbers in each pane. */
export declare const WORKFLOW_CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS: monaco.editor.IEditorOptions;
