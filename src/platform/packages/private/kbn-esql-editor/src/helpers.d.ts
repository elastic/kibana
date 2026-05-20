import type { UseEuiTheme } from '@elastic/eui';
import { monaco, type MonacoMessage } from '@kbn/code-editor';
import { type MapCache } from 'lodash';
export declare const useDebounceWithOptions: (fn: Function, { skipFirstRender }?: {
    skipFirstRender: boolean;
}, ms?: number | undefined, deps?: React.DependencyList | undefined) => import("react-use/lib/useDebounce").UseDebounceReturn;
export declare const parseWarning: (warning: string) => MonacoMessage[];
export declare const parseErrors: (errors: Error[], code: string) => MonacoMessage[];
export declare const CACHE_INVALIDATE_DELAY: number;
export declare const DATA_SOURCES_CACHE_KEY = "dataSources";
export declare const HISTORY_STARRED_ITEMS_CACHE_KEY = "historyStarredItems";
export declare const clearCacheWhenOld: (cache: MapCache, key: string) => void;
export declare const onMouseDownResizeHandler: (mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent, height: number, setHeight: (height: number) => void, secondPanelHeight?: number, setSecondPanelHeight?: (height: number) => void) => void;
export declare const onKeyDownResizeHandler: (keyDownEvent: React.KeyboardEvent, height: number, setHeight: (height: number) => void, secondPanelHeight?: number, setSecondPanelHeight?: (height: number) => void) => void;
export declare const getEditorOverwrites: (theme: UseEuiTheme<{}>) => import("@emotion/react").SerializedStyles;
export declare const filterDataErrors: (errors: (MonacoMessage & {
    code: string;
})[]) => MonacoMessage[];
/**
 * Filters warning messages that overlap with error messages ranges.
 */
export declare const filterOutWarningsOverlappingWithErrors: (errors: MonacoMessage[], warnings: MonacoMessage[]) => MonacoMessage[];
export declare const filterDuplicatedWarnings: (warnings: (MonacoMessage & {
    code: string;
})[]) => MonacoMessage[];
/**
 * Computes toggled comment lines for a set of lines, following standard IDE behavior:
 * comment all lines if any line is uncommented, uncomment all only if every line
 * is already commented.
 */
export declare const getToggleCommentLines: (lines: string[]) => string[];
/**
 * Keeps suggestions alive when the text before the cursor ends with:
 * - a token character (`[\w`]`)
 * - a space
 * - `::`
 * - `.`
 */
export declare const shouldAutoTriggerSuggestions: (lineContentBeforeCursor: string) => boolean;
/**
 * Tracks the Monaco suggest-widget visibility so the editor can avoid
 * re-triggering autocomplete while the popup is already open.
 */
export declare const trackSuggestionPopupState: (editor: monaco.editor.IStandaloneCodeEditor, isSuggestionPopupOpenRef: React.MutableRefObject<boolean>) => void;
/**
 * Checks if the code actions menu is being displayed.
 * @param editor
 * @returns
 */
export declare const isCodeActionMenuVisible: (editor: monaco.editor.IStandaloneCodeEditor) => boolean;
