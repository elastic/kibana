import { type ESQLControlVariable } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../registry/types';
import type { FunctionParameterType, SupportedDataType } from '../types';
import type { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';
export declare const TIME_SYSTEM_PARAMS: string[];
export interface BuildConstantsOptions {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
}
export interface DateLiteralsOptions {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
}
export declare const buildConstantsDefinitions: (userConstants: string[], detail?: string, 
/**
 * Whether or not to advance the cursor and open the suggestions dialog after inserting the constant.
 */
options?: BuildConstantsOptions, documentationValue?: string, category?: SuggestionCategory) => ISuggestionItem[];
export declare function getDateLiterals(options?: DateLiteralsOptions): ISuggestionItem[];
export declare function getUnitDuration(unit?: number): string[];
/**
 * Returns time unit literals (e.g., "1 day", "1 hour") and optionally appends a trailing comma item.
 * Generic literal builder (no policy), controlled via options.
 */
export declare function getTimeUnitLiterals(addComma: boolean, advanceCursorAndOpenSuggestions: boolean): ISuggestionItem[];
/**
 * Given information about the current parameter type, suggest
 * some literals that may make sense.
 */
export declare function getCompatibleLiterals(types: (FunctionParameterType | SupportedDataType | 'unknown')[], options?: {
    advanceCursorAndOpenSuggestions?: boolean;
    addComma?: boolean;
    supportsControls?: boolean;
}, variables?: ESQLControlVariable[]): ISuggestionItem[];
