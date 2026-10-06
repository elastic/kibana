import type { ISuggestionItem } from '@kbn/esql-language/src/commands/registry/types';
import { monaco } from '../../../../monaco_imports';
import type { MonacoMessage } from '../providers/types';
export declare function monacoPositionToOffset(expression: string, position: monaco.Position): number;
/**
 * Given an offset range, returns a monaco IRange object.
 *
 * IMPORTANT NOTE:
 * offset ranges are ZERO-based and NOT end-inclusive — [start, end)
 * monaco ranges are ONE-based and NOT end-inclusive — [start, end)
 */
export declare const offsetRangeToMonacoRange: (expression: string, range: {
    start: number;
    end: number;
}) => {
    startColumn: number;
    endColumn: number;
    startLineNumber: number;
    endLineNumber: number;
} | undefined;
export declare const getDecorationHoveredMessages: (word: monaco.editor.IWordAtPosition, position: monaco.Position, model: monaco.editor.ITextModel) => string[];
/**
 * Extracts the suggestions with custom commands from a list of suggestions.
 * Suggestions with editor.action.triggerSuggest are excluded.
 * @param suggestions
 * @returns
 */
export declare const filterSuggestionsWithCustomCommands: (suggestions: ISuggestionItem[]) => string[];
/**
 * Given a marker it returns the editor message from which it was created.
 * @param messages
 * @param marker
 * @returns
 */
export declare const findMessageByMarker: (messages: MonacoMessage[], marker: monaco.editor.IMarkerData) => MonacoMessage | undefined;
