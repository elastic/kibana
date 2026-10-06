import type { PainlessCompletionResult, PainlessCompletionItem, PainlessContext, PainlessAutocompleteField } from '../../types';
export interface Suggestion extends PainlessCompletionItem {
    properties?: PainlessCompletionItem[];
    constructorDefinition?: PainlessCompletionItem;
}
export declare const getKeywords: () => PainlessCompletionItem[];
export declare const getTypeSuggestions: () => PainlessCompletionItem[];
export declare const getStaticSuggestions: ({ suggestions, hasFields, isRuntimeContext, }: {
    suggestions: Suggestion[];
    hasFields?: boolean;
    isRuntimeContext?: boolean;
}) => PainlessCompletionResult;
export declare const getClassMemberSuggestions: (suggestions: Suggestion[], className: string) => PainlessCompletionResult;
export declare const getFieldSuggestions: (fields: PainlessAutocompleteField[]) => PainlessCompletionResult;
export declare const getConstructorSuggestions: (suggestions: Suggestion[]) => PainlessCompletionResult;
export declare const getAutocompleteSuggestions: (painlessContext: PainlessContext, words: string[], fields?: PainlessAutocompleteField[]) => PainlessCompletionResult;
