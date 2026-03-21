import type { UseEuiTheme } from '@elastic/eui';
import { type MapCache } from 'lodash';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
export declare const useDebounceWithOptions: (fn: Function, { skipFirstRender }?: {
    skipFirstRender: boolean;
}, ms?: number | undefined, deps?: React.DependencyList | undefined) => import("react-use/lib/useDebounce").UseDebounceReturn;
export declare const parseWarning: (warning: string) => MonacoMessage[];
export declare const parseErrors: (errors: Error[], code: string) => MonacoMessage[];
export declare const clearCacheWhenOld: (cache: MapCache, esqlQuery: string) => void;
export declare const onMouseDownResizeHandler: (mouseDownEvent: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.TouchEvent, height: number, setHeight: (height: number) => void, secondPanelHeight?: number, setSecondPanelHeight?: (height: number) => void) => void;
export declare const onKeyDownResizeHandler: (keyDownEvent: React.KeyboardEvent, height: number, setHeight: (height: number) => void, secondPanelHeight?: number, setSecondPanelHeight?: (height: number) => void) => void;
export declare const getEditorOverwrites: (theme: UseEuiTheme<{}>) => import("@emotion/utils").SerializedStyles;
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
