import type { ESQLAstAllCommands, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../types';
export type SortPosition = 'expression' | 'order_complete' | 'after_order' | 'nulls_complete' | 'after_nulls';
export declare const getSortPos: (query: string, command: ESQLAstAllCommands) => {
    position: SortPosition | undefined;
    expressionRoot: ESQLSingleAstItem | undefined;
};
export declare const sortModifierSuggestions: {
    ASC: ISuggestionItem;
    DESC: ISuggestionItem;
    NULLS_FIRST: ISuggestionItem;
    NULLS_LAST: ISuggestionItem;
};
export declare const rightAfterColumn: (innerText: string, expressionRoot: ESQLSingleAstItem | undefined, columnExists: (name: string) => boolean) => boolean;
export declare const getSuggestionsAfterCompleteExpression: (innerText: string, expressionRoot: ESQLSingleAstItem | undefined, columnExists: (name: string) => boolean) => ISuggestionItem[];
