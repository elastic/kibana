import type { Uri } from 'monaco-editor/esm/vs/editor/editor.api';
export interface UndoRedoElement {
    readonly type: 0;
    readonly resource: Uri;
    readonly label: string;
    readonly code: string;
    undo(): void;
    redo(): void;
}
export interface UndoRedoService {
    pushElement(element: UndoRedoElement): void;
}
/**
 * Returns Monaco's internal IUndoRedoService for pushing custom undo/redo elements
 * that interleave with text edits on the same per-resource stack.
 *
 * Returns undefined if the service is not available (e.g., in test environments
 * or before Monaco is fully initialized).
 */
export declare const getUndoRedoService: () => UndoRedoService | undefined;
