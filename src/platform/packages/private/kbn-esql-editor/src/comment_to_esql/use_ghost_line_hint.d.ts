import { monaco } from '@kbn/code-editor';
import type { MutableRefObject } from 'react';
export declare const CURSOR_PAUSE_MS = 400;
export type GhostHintKind = 'empty' | 'comment' | null;
/**
 * Decides which (if any) ghost hint to show for the given line.
 * - 'empty':   cursor is on a blank line in a non-empty editor
 *              (the editor's own placeholder covers the entirely-empty case).
 * - 'comment': cursor is on a `//` line — prompts the user to invoke nl-to-esql.
 * - null:      neither.
 */
export declare const getGhostHintKind: (model: monaco.editor.ITextModel, lineNumber: number) => GhostHintKind;
interface UseGhostLineHintParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    isReviewActiveRef: MutableRefObject<object | null>;
    isEnabled: boolean;
    isGeneratingRef?: MutableRefObject<boolean>;
    clearGhostHintRef?: MutableRefObject<() => void>;
}
export declare const useGhostLineHint: ({ editorRef, editorModel, isReviewActiveRef, isEnabled, isGeneratingRef, clearGhostHintRef, }: UseGhostLineHintParams) => {
    ghostLineHintStyle: import("@emotion/react").SerializedStyles;
    setupGhostLineHint: (editor: monaco.editor.IStandaloneCodeEditor) => monaco.IDisposable[];
};
export {};
