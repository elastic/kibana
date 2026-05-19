import type { ISuggestionItem } from '../../../../../registry/types';
import { type PromQLFunctionParamType } from '../../../../types';
/** Returns function suggestions, optionally filtered by expected return types. */
export declare const suggestFunctions: (returnTypes?: PromQLFunctionParamType[]) => ISuggestionItem[];
