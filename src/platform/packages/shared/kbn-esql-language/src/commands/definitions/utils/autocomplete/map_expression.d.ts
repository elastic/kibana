import { type ISuggestionItem } from '../../../registry/types';
import { type MapValueType } from '../../../registry/complete_items';
export declare const DOUBLE_QUOTED_STRING_REGEX: RegExp;
export declare const OBJECT_KEYS_REGEX: RegExp;
export interface MapParameterValues {
    type: MapValueType;
    rawType?: string;
    suggestions?: ISuggestionItem[];
    description?: string;
}
export type MapParameters = Record<string, MapParameterValues>;
/**
 * This function provides suggestions for map expressions within a command.
 *
 * You must provide a record of available entries, where each key is a parameter name and the value is an
 * array of suggestions for that parameter.
 *
 * Examples:
 *  | COMPLETION "prompt" WITH {                       ---> suggests parameters names
 *  | COMPLETION "prompt" WITH { "                     ---> suggests parameters names
 *  | COMPLETION "prompt" WITH { "param1":           ---> suggests parameter values
 *  | COMPLETION "prompt" WITH { "param1": "           ---> suggests parameter values
 *  | COMPLETION "prompt" WITH { "param1": "value",    ---> suggests parameter names that were not used
 *  | COMPLETION "prompt" WITH { "param1": "value", "  ---> suggests parameter names that were not used
 *  | COMPLETION "prompt" WITH { "nestedParam": {      ---> suggests []
 *
 * This helper does not suggest enclosing brackets.
 * This helper does not support suggestions within nested maps, we don't have currently a case where it's needed,
 *  so no suggestions will be provided within a nested map.
 *
 * @param innerText
 * @param availableParameters
 */
export declare function getCommandMapExpressionSuggestions(innerText: string, availableParameters: MapParameters, includePlaceholder?: boolean): ISuggestionItem[];
