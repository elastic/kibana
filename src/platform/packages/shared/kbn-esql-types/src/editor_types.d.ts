import type { ILicense } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { RecommendedField, RecommendedQuery } from './extensions_autocomplete_types';
import type { ESQLSourceResult, EsqlDatasetsResult, EsqlViewsResult, IndexAutocompleteItem } from './sources_autocomplete_types';
import type { ESQLControlVariable } from './variables_types';
import type { InferenceEndpointsAutocompleteResult } from './inference_endpoint_autocomplete_types';
export interface ESQLControlsContext {
    /** The editor supports the creation of controls,
     * This flag should be set to true to display the "Create control" suggestion
     **/
    supportsControls: boolean;
    /** Function to be called after the control creation **/
    onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
    /** Function to be called after cancelling the control creation **/
    onCancelControl: () => void;
}
export interface ESQLQueryStats {
    /** Duration of the last query in milliseconds */
    durationInMs?: string;
    /** Total number of documents queried in the last query */
    totalDocumentsProcessed?: number;
}
/** @internal **/
type CallbackFn<Options = {}, Result = string> = (ctx?: Options) => Result[] | Promise<Result[]>;
/**
 * All supported field types in ES|QL. This is all the types
 * that can come back in the table from a query.
 */
export declare const esqlFieldTypes: readonly string[];
export type EsqlFieldType = (typeof esqlFieldTypes)[number];
/**
 *  Partial fields metadata client, used to avoid circular dependency with @kbn/monaco
 **/
export interface PartialFieldsMetadataClient {
    find: ({ fieldNames, attributes, streamNames, source, }: {
        fieldNames?: string[];
        attributes: string[];
        streamNames?: string[];
        source?: string[];
    }) => Promise<{
        fields: Record<string, {
            type: string;
            source: string;
            description?: string;
        }>;
        streamFields: Record<string, Record<string, {
            type: string;
            source: string;
            description?: string;
        }>>;
    }>;
}
export interface ESQLFieldWithMetadata {
    name: string;
    type: EsqlFieldType;
    userDefined: false;
    isEcs?: boolean;
    hasConflict?: boolean;
    originalTypes?: string[];
    isUnmappedField?: boolean;
    metadata?: {
        description?: string;
    };
}
declare enum KQLInESQLSuggestionType {
    Value = "Value",
    Operator = "Operator",
    Field = "Field"
}
/** Maps KQL suggestion types to ISuggestionItem kind values */
export declare const KQL_TYPE_TO_KIND_MAP: Record<string, KQLInESQLSuggestionType>;
interface KQLInESQLSuggestion {
    text: string;
    label: string;
    kind: KQLInESQLSuggestionType;
    detail?: string;
    range: {
        start: number;
        end: number;
    };
}
export interface ESQLCallbacks {
    getSources?: CallbackFn<{}, ESQLSourceResult>;
    getColumnsFor?: CallbackFn<{
        query: string;
    }, ESQLFieldWithMetadata>;
    getPolicies?: CallbackFn<{}, {
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
    }>;
    getPreferences?: () => Promise<{
        histogramBarTarget: number;
    }>;
    getFieldsMetadata?: Promise<PartialFieldsMetadataClient>;
    getVariables?: () => ESQLControlVariable[] | undefined;
    canSuggestVariables?: () => boolean;
    getJoinIndices?: (cacheOptions?: {
        forceRefresh?: boolean;
    }) => Promise<{
        indices: IndexAutocompleteItem[];
    }>;
    getTimeseriesIndices?: () => Promise<{
        indices: IndexAutocompleteItem[];
    }>;
    getViews?: () => Promise<EsqlViewsResult>;
    getDatasets?: () => Promise<EsqlDatasetsResult>;
    getEditorExtensions?: (queryString: string) => Promise<{
        recommendedQueries: RecommendedQuery[];
        recommendedFields: RecommendedField[];
    }>;
    getInferenceEndpoints?: (taskType: string) => Promise<InferenceEndpointsAutocompleteResult>;
    getLicense?: () => Promise<Pick<ILicense, 'hasAtLeast'> | undefined>;
    getActiveProduct?: () => PricingProduct | undefined;
    getHistoryStarredItems?: () => Promise<string[]>;
    canCreateLookupIndex?: (indexName: string) => Promise<boolean>;
    isServerless?: boolean;
    /** Enables the "Browse indices" suggestion and command integration. */
    canSuggestResourceBrowser?: () => Promise<boolean>;
    getKqlSuggestions?: (kqlQuery: string, cursorPositionInKql: number) => Promise<KQLInESQLSuggestion[] | undefined>;
}
export {};
