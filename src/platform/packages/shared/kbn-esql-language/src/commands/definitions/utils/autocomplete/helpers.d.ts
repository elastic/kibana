import type { ESQLControlVariable, InferenceEndpointAutocompleteItem, ControlTriggerSource } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { GetColumnsByTypeFn, ICommandCallbacks, ICommandContext, ISuggestionItem } from '../../../registry/types';
import { Location } from '../../../registry/types';
import type { SupportedDataType } from '../../types';
import type { FunctionDefinitionTypes } from '../../types';
export declare const shouldBeQuotedText: (text: string, { dashSupported }?: {
    dashSupported?: boolean;
}) => boolean;
export declare const getSafeInsertText: (text: string, options?: {
    dashSupported?: boolean;
}) => string;
export declare const buildUserDefinedColumnsDefinitions: (userDefinedColumns: string[]) => ISuggestionItem[];
export declare const findFinalWord: (text: string) => string;
export declare function findPreviousWord(text: string): string;
export declare function withinQuotes(text: string): boolean;
interface FieldSuggestionsOptions {
    ignoreColumns?: string[];
    values?: boolean;
    addSpaceAfterField?: boolean;
    openSuggestions?: boolean;
    addComma?: boolean;
    canBeMultiValue?: boolean;
}
export declare function getFieldsSuggestions(types: (SupportedDataType | 'unknown' | 'any')[], getFieldsByType: GetColumnsByTypeFn, options?: FieldSuggestionsOptions): Promise<ISuggestionItem[]>;
interface FunctionSuggestionOptions {
    ignored?: string[];
    addComma?: boolean;
    addSpaceAfterFunction?: boolean;
    constantGeneratingOnly?: boolean;
    suggestOnlyName?: boolean;
    functionTypes?: FunctionDefinitionTypes[];
}
interface GetFunctionsSuggestionsParams {
    location: Location;
    types: (SupportedDataType | 'unknown' | 'any')[];
    options?: FunctionSuggestionOptions;
    context?: ICommandContext;
    callbacks?: ICommandCallbacks;
}
export declare function getFunctionsSuggestions({ location, types, options, context, callbacks, }: GetFunctionsSuggestionsParams): ISuggestionItem[];
interface LiteralSuggestionsOptions {
    includeDateLiterals?: boolean;
    includeCompatibleLiterals?: boolean;
    addComma?: boolean;
    advanceCursorAndOpenSuggestions?: boolean;
    supportsControls?: boolean;
    variables?: ESQLControlVariable[];
}
export declare function getLiteralsSuggestions(types: (SupportedDataType | 'unknown' | 'any')[], location: Location, options?: LiteralSuggestionsOptions): ISuggestionItem[];
export declare function getLastNonWhitespaceChar(text: string): string;
export declare const columnExists: (col: string, context?: ICommandContext) => boolean;
export declare function getControlSuggestion(type: ESQLVariableType, triggerSource: ControlTriggerSource, variables?: string[], suggestCreation?: boolean): ISuggestionItem[];
export declare const getVariablePrefix: (variableType: ESQLVariableType) => "?" | "??";
export declare function getControlSuggestionIfSupported(supportsControls: boolean, type: ESQLVariableType, triggerSource: ControlTriggerSource, variables?: ESQLControlVariable[], shouldBePrefixed?: boolean): ISuggestionItem[];
export declare function createInferenceEndpointToCompletionItem(inferenceEndpoint: InferenceEndpointAutocompleteItem): ISuggestionItem;
/**
 * Given a suggestion item, decorates it with editor.action.triggerSuggest
 * that triggers the autocomplete dialog again after accepting the suggestion.
 *
 * If the suggestion item already has a custom command, it will preserve it, by attaching
 * the triggerSuggest command as part of a multiCommands execution.
 */
export declare function withAutoSuggest(suggestionItem: ISuggestionItem): ISuggestionItem;
/**
 * Appends a command to a suggestion item, preserving existing commands by using multiCommands if necessary.
 * @param suggestionItem
 * @param commandToAppend
 * @returns
 */
export declare function appendCommandToSuggestionItem(suggestionItem: ISuggestionItem, commandToAppend: ISuggestionItem['command']): ISuggestionItem;
export declare function getLookupIndexCreateSuggestion(indexName?: string): ISuggestionItem;
export {};
