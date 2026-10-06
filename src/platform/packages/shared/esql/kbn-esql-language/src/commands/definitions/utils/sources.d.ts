import type { ESQLCallbacks, EsqlDataset, IndexAutocompleteItem, ESQLSourceResult, EsqlView } from '@kbn/esql-types';
import type { ESQLAstAllCommands, ESQLAstJoinCommand, ESQLSource } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../registry/types';
export declare const removeSourceNameQuotes: (sourceName: string) => string;
export declare const cleanIndex: (inputIndex: string) => string;
export declare function shouldBeQuotedSource(text: string): boolean;
export declare const buildSourcesDefinitions: (sources: Array<{
    name: string;
    isIntegration: boolean;
    title?: string;
    description?: string;
    links?: Array<{
        label: string;
        url: string;
    }>;
    type?: string;
}>, sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
}) => ISuggestionItem[];
/**
 * Builds suggestion items for ES|QL views (GET _query/view).
 */
export declare const buildViewsDefinitions: (views: EsqlView[], alreadyUsed?: string[]) => ISuggestionItem[];
/**
 * Builds suggestion items for ES|QL datasets (GET _query/dataset).
 */
export declare const buildDatasetsDefinitions: (datasets: EsqlDataset[], alreadyUsed?: string[]) => ISuggestionItem[];
/**
 * Checks if the source exists in the provided sources set.
 * It supports both exact matches and fuzzy searches.
 *
 * @param index - The index to check, which can be a single value or a comma-separated list.
 * @param sources - A Set of source names to check against.
 * @returns true if the source exists, false otherwise.
 */
export declare function sourceExists(index: string, sources: Set<string>): boolean;
export declare function getSourcesFromCommands(commands: ESQLAstAllCommands[], sourceType: 'index' | 'policy'): ESQLSource[];
/**
 * Returns true when a wired stream has been used as a source in the query.
 */
export declare function hasWiredStreamsInQuery(query: string, callbacks?: Pick<ESQLCallbacks, 'getSources'>): Promise<boolean>;
export declare function getSourceSuggestions(sources: ESQLSourceResult[], alreadyUsed: string[], sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
}): ISuggestionItem[];
export declare function additionalSourcesSuggestions(queryText: string, sources: ESQLSourceResult[], ignored: string[], recommendedQuerySuggestions: ISuggestionItem[], views?: EsqlView[], datasets?: EsqlDataset[], sourceReplacementContext?: {
    textBeforeCursor: string;
    commandStart: number;
}): Promise<ISuggestionItem[]>;
export declare const specialIndicesToSuggestions: (indices: IndexAutocompleteItem[]) => ISuggestionItem[];
/**
 * Returns the source node from the target index of a JOIN command.
 * For example, in the following JOIN command, it returns the source node representing "lookup_index":
 * | LOOKUP JOIN lookup_index AS l ON source_index.id = l.id
 */
export declare const getLookupJoinSource: (command: ESQLAstJoinCommand) => string | undefined;
export declare function getIndexSourcesFromQuery(query: string): string[];
