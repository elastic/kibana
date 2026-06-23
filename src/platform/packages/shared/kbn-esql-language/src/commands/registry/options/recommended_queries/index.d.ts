import type { RecommendedQuery, RecommendedField } from '@kbn/esql-types';
import type { GetColumnsByTypeFn, ISuggestionItem } from '../../types';
import type { SuggestionCategory } from '../../../../language/autocomplete/utils/sorting/types';
export interface EditorExtensions {
    recommendedQueries: RecommendedQuery[];
    recommendedFields: RecommendedField[];
}
interface QueryTemplate {
    label: string;
    description: string;
    queryString: string;
    category?: SuggestionCategory;
}
export declare const getRecommendedQueriesTemplates: ({ fromCommand, timeField, categorizationField, }: {
    fromCommand: string;
    timeField?: string;
    categorizationField?: string;
}) => QueryTemplate[];
export declare function getTimeAndCategorizationFields(getColumnsByType: GetColumnsByTypeFn): Promise<{
    timeField: string;
    categorizationField: string | undefined;
}>;
export declare const getRecommendedQueriesSuggestionsFromStaticTemplates: (getFieldsByType: GetColumnsByTypeFn, fromCommand?: string) => Promise<ISuggestionItem[]>;
/**
 * This function extracts the templates from the recommended queries extensions.
 * The templates are the recommended queries without the source command (FROM).
 * This is useful for showing the templates in the autocomplete suggestions when the users have already typed the FROM command.
 * @param recommendedQueriesExtensions, the recommended queries extensions to extract the templates from
 * @returns ISuggestionItem[], the templates extracted from the recommended queries extensions
 */
export declare const getRecommendedQueriesTemplatesFromExtensions: (recommendedQueriesExtensions: RecommendedQuery[]) => ISuggestionItem[];
export declare const getRecommendedQueriesSuggestions: (editorExtensions: EditorExtensions, getColumnsByType?: GetColumnsByTypeFn, prefix?: string) => Promise<ISuggestionItem[]>;
/**
 * This function returns the categorization field from the list of fields.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first field from the list,
 * Assumes text fields have been passed in the `fields` array.
 *
 * This function is a duplicate of the one in src/platform/packages/shared/kbn-aiops-utils.
 * It is included here to avoid build errors due to bazel
 *
 * TODO: Remove this function once the bazel issue is resolved.
 *
 * @param fields, the list of fields to check
 * @returns string | undefined, the categorization field if found, otherwise undefined
 */
export declare function getCategorizationField(fields: string[]): string | undefined;
export {};
