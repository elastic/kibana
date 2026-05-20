import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '../../common/types';
export interface FieldDescriptor {
    aggregatable: boolean;
    name: string;
    readFromDocValues: boolean;
    searchable: boolean;
    type: string;
    esTypes: string[];
    subType?: FieldSubType;
    metadata_field?: boolean;
    fixedInterval?: string[];
    timeZone?: string[];
    timeSeriesMetric?: estypes.MappingTimeSeriesMetricType;
    timeSeriesDimension?: boolean;
    defaultFormatter?: string;
}
interface FieldSubType {
    multi?: {
        parent: string;
    };
    nested?: {
        path: string;
    };
}
interface IndexPatternsFetcherOptionalParams {
    uiSettingsClient: IUiSettingsClient;
    allowNoIndices?: boolean;
    rollupsEnabled?: boolean;
}
export interface GetIndexPatternMatchesResult {
    matchedIndexPatterns: string[];
    matchedIndices?: string[];
    matchesByIndexPattern?: Record<string, string[]>;
}
export declare class IndexPatternsFetcher {
    private readonly elasticsearchClient;
    private readonly uiSettingsClient?;
    private readonly allowNoIndices;
    private readonly rollupsEnabled;
    constructor(elasticsearchClient: ElasticsearchClient, optionalParams?: IndexPatternsFetcherOptionalParams);
    /**
     *  Get a list of field objects for an index pattern that may contain wildcards
     *
     *  @param {Object} [options]
     *  @property {String} options.pattern The index pattern
     *  @property {Number} options.metaFields The list of underscore prefixed fields that should
     *                                        be left in the field list (all others are removed).
     *  @return {Promise<Array<Fields>>}
     */
    getFieldsForWildcard(options: {
        pattern: string | string[];
        metaFields?: string[];
        fieldCapsOptions?: {
            allow_no_indices: boolean;
            includeUnmapped?: boolean;
        };
        type?: string;
        rollupIndex?: string;
        indexFilter?: QueryDslQueryContainer;
        fields?: string[];
        allowHidden?: boolean;
        fieldTypes?: string[];
        includeEmptyFields?: boolean;
        abortSignal?: AbortSignal;
        runtimeMappings?: estypes.MappingRuntimeFields;
        projectRouting?: string;
    }): Promise<{
        fields: FieldDescriptor[];
        indices: string[];
    }>;
    /**
     * Checks whether the passed index pattern is an excluding one.
     * The excluding index pattern starts with a dash, e.g. "-logs-excluded-*"
     * meaning all indices matching "logs-excluded-*" will be excluded from search
     *
     * @param indexPattern - Index pattern to check
     * @returns Whether the passed index pattern is a negated one
     */
    isExcludingIndexPattern(indexPattern: string): boolean;
    /**
     * For each input pattern, checks whether it resolves to at least one backing index.
     *
     * Including index patterns (not starting with `-`) are checked with field caps using that pattern
     * together with every excluding index pattern (starting with `-`) in the list, so resolution matches
     * Elasticsearch multi-target syntax.
     *
     * @param indexPatterns - Index patterns to check (may include wildcards and excluded entries).
     * @returns Resolves to {@link GetIndexPatternMatchesResult}:
     *   - `matchedIndexPatterns`: input patterns that matched at least one index.
     *   - `matchedIndices`: deduplicated concrete index names matching index patterns (omitted on failure).
     *   - `matchesByIndexPattern`: per-input-pattern matched indices (omitted on failure).
     */
    getIndexPatternMatches(indexPatterns: string[]): Promise<GetIndexPatternMatchesResult>;
}
export {};
