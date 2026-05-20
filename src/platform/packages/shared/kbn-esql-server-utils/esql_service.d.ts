import type { ElasticsearchClient } from '@kbn/core/server';
import { type IndicesAutocompleteResult, type ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { EsqlViewsResult } from '@kbn/esql-types';
import type { ESQLSourceResult, EsqlDatasetsResult, InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
export interface EsqlServiceOptions {
    client: ElasticsearchClient;
}
export declare class EsqlService {
    readonly options: EsqlServiceOptions;
    constructor(options: EsqlServiceOptions);
    /**
     * Get indices by their mode (lookup or time_series).
     * @param mode The mode to filter indices by.
     * @param remoteClusters Optional comma-separated list of remote clusters to include.
     * @returns A promise that resolves to the indices autocomplete result.
     */
    getIndicesByIndexMode(mode: 'lookup' | 'time_series', remoteClusters?: string): Promise<IndicesAutocompleteResult>;
    /**
     * Get all indices, aliases, and data streams for ES|QL sources autocomplete.
     * @param scope The scope to retrieve indices for (local or all).
     * @param projectRouting Optional CPS project routing value. When provided it is forwarded
     *   directly to Elasticsearch as `project_routing` so that index resolution reflects the
     *   project picker selection or an explicit `SET project_routing` pre-statement.
     * @returns A promise that resolves to an array of ESQL source results.
     */
    getAllIndices(scope?: 'local' | 'all' | 'remote', projectRouting?: string): Promise<ESQLSourceResult[]>;
    private getIndexSourceType;
    private processSuggestedIndices;
    private processSuggestedAliases;
    private processSuggestedDataStreams;
    /**
     * Get all ES|QL views from the cluster (GET _query/view).
     * @returns A promise that resolves to the views response (list of view names and queries).
     */
    getViews(): Promise<EsqlViewsResult>;
    /**
     * Get all ES|QL datasets from the cluster (GET _query/dataset).
     * @returns A promise that resolves to the datasets response.
     */
    getDatasets(): Promise<EsqlDatasetsResult>;
    /**
     * Get inference endpoints for a specific task type.
     * @param taskType The type of inference task to retrieve endpoints for.
     * @returns A promise that resolves to the inference endpoints autocomplete result.
     */
    getInferenceEndpoints(taskType: string): Promise<InferenceEndpointsAutocompleteResult>;
    /**
     * Get enrich policies formatted for ES|QL autocomplete.
     * @returns A promise that resolves to an array of enrich policy objects.
     */
    getPolicies(): Promise<Array<{
        name: string;
        sourceIndices: string[];
        matchField: string;
        enrichFields: string[];
    }>>;
    /**
     * Get columns for an ES|QL query by executing it with LIMIT 0.
     * @param esqlQuery The ES|QL query to get columns for.
     * @returns A promise that resolves to an array of ESQLFieldWithMetadata.
     */
    getColumns(esqlQuery: string): Promise<ESQLFieldWithMetadata[]>;
}
