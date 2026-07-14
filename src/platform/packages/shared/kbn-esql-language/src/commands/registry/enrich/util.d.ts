import type { ESQLAstAllCommands } from '@elastic/esql/types';
import type { ESQLPolicy, ISuggestionItem } from '../types';
export declare const ENRICH_MODES: {
    name: string;
    description: string;
}[];
export declare const buildPoliciesDefinitions: (policies: Array<{
    name: string;
    sourceIndices: string[];
}>) => ISuggestionItem[];
export declare const getPolicyMetadata: (policies: Map<string, ESQLPolicy>, policyName: string) => ESQLPolicy | undefined;
export declare enum Position {
    MODE = "mode",
    POLICY = "policy",
    AFTER_POLICY = "after_policy",
    MATCH_FIELD = "match_field",
    AFTER_ON_CLAUSE = "after_on_clause",
    WITH_NEW_CLAUSE = "with_new_clause",
    WITH_AFTER_FIRST_WORD = "with_after_first_word",
    WITH_AFTER_ASSIGNMENT = "with_after_assignment",
    WITH_AFTER_COMPLETE_CLAUSE = "with_after_complete_clause"
}
export declare const getPosition: (innerText: string, command: ESQLAstAllCommands) => Position | undefined;
export declare const noPoliciesAvailableSuggestion: ISuggestionItem;
export declare const modeDescription: string;
export declare const modeSuggestions: ISuggestionItem[];
export declare const onSuggestion: ISuggestionItem;
export declare const withSuggestion: ISuggestionItem;
export declare const buildMatchingFieldsDefinition: (matchingField: string, fields: string[]) => ISuggestionItem[];
