/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-js
 */
export type TODO = Record<string, any>;
export interface BulkCreateOperation extends BulkWriteOperation {
}
export interface BulkDeleteOperation extends BulkOperationBase {
}
export interface BulkIndexOperation extends BulkWriteOperation {
}
export interface BulkOperationBase {
    _id?: Id;
    _index?: IndexName;
    routing?: Routing;
    if_primary_term?: long;
    if_seq_no?: SequenceNumber;
    version?: VersionNumber;
    version_type?: VersionType;
}
export interface BulkOperationContainer {
    index?: BulkIndexOperation;
    create?: BulkCreateOperation;
    update?: BulkUpdateOperation;
    delete?: BulkDeleteOperation;
}
export type BulkOperationType = 'index' | 'create' | 'update' | 'delete';
export interface BulkRequest<TDocument = unknown, TPartialDocument = unknown> extends RequestBase {
    index?: IndexName;
    pipeline?: string;
    refresh?: Refresh;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;

    wait_for_active_shards?: WaitForActiveShards;
    require_alias?: boolean;
    operations?: (BulkOperationContainer | BulkUpdateAction<TDocument, TPartialDocument> | TDocument)[];
}
export interface BulkResponse {
    errors: boolean;
    items: Partial<Record<BulkOperationType, BulkResponseItem>>[];
    took: long;
    ingest_took?: long;
}
export interface BulkResponseItem {
    _id?: string | null;
    _index: string;
    status: integer;
    error?: ErrorCause;
    _primary_term?: long;
    result?: string;
    _seq_no?: SequenceNumber;
    _shards?: ShardStatistics;
    _version?: VersionNumber;
    forced_refresh?: boolean;
    get?: InlineGet<Record<string, any>>;
}
export interface BulkUpdateAction<TDocument = unknown, TPartialDocument = unknown> {
    detect_noop?: boolean;
    doc?: TPartialDocument;
    doc_as_upsert?: boolean;
    script?: Script | string;
    scripted_upsert?: boolean;
    _source?: SearchSourceConfig;
    upsert?: TDocument;
}
export interface BulkUpdateOperation extends BulkOperationBase {
    require_alias?: boolean;
    retry_on_conflict?: integer;
}
export interface BulkWriteOperation extends BulkOperationBase {
    dynamic_templates?: Record<string, string>;
    pipeline?: string;
    require_alias?: boolean;
}
export interface ClearScrollRequest extends RequestBase {
    scroll_id?: ScrollIds;
}
export interface ClearScrollResponse {
    succeeded: boolean;
    num_freed: integer;
}
export interface ClosePointInTimeRequest extends RequestBase {
    id: Id;
}
export interface ClosePointInTimeResponse {
    succeeded: boolean;
    num_freed: integer;
}
export interface CountRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    min_score?: double;
    preference?: string;
    routing?: Routing;
    terminate_after?: long;
    q?: string;
    query?: QueryDslQueryContainer;
}
export interface CountResponse {
    count: long;
    _shards: ShardStatistics;
}
export interface CreateRequest<TDocument = unknown> extends RequestBase {
    id: Id;
    index: IndexName;
    pipeline?: string;
    refresh?: Refresh;
    routing?: Routing;

    version?: VersionNumber;
    version_type?: VersionType;
    wait_for_active_shards?: WaitForActiveShards;
    document?: TDocument;
}
export type CreateResponse = WriteResponseBase;
export interface DeleteRequest extends RequestBase {
    id: Id;
    index: IndexName;
    if_primary_term?: long;
    if_seq_no?: SequenceNumber;
    refresh?: Refresh;
    routing?: Routing;

    version?: VersionNumber;
    version_type?: VersionType;
    wait_for_active_shards?: WaitForActiveShards;
}
export type DeleteResponse = WriteResponseBase;
export interface DeleteByQueryRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    conflicts?: Conflicts;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    from?: long;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    preference?: string;
    refresh?: boolean;
    request_cache?: boolean;
    requests_per_second?: float;
    routing?: Routing;
    q?: string;
    scroll?: Duration;
    scroll_size?: long;

    search_type?: SearchType;
    slices?: Slices;
    sort?: string[];
    stats?: string[];
    terminate_after?: long;

    version?: boolean;
    wait_for_active_shards?: WaitForActiveShards;
    wait_for_completion?: boolean;
    max_docs?: long;
    query?: QueryDslQueryContainer;
    slice?: SlicedScroll;
}
export interface DeleteByQueryResponse {
    batches?: long;
    deleted?: long;
    failures?: BulkIndexByScrollFailure[];
    noops?: long;
    requests_per_second?: float;
    retries?: Retries;
    slice_id?: integer;
    task?: TaskId;
    throttled?: Duration;
    throttled_millis?: DurationValue<UnitMillis>;
    throttled_until?: Duration;
    throttled_until_millis?: DurationValue<UnitMillis>;
    timed_out?: boolean;
    took?: DurationValue<UnitMillis>;
    total?: long;
    version_conflicts?: long;
}
export interface DeleteByQueryRethrottleRequest extends RequestBase {
    task_id: TaskId;
    requests_per_second?: float;
}
export type DeleteByQueryRethrottleResponse = TasksTaskListResponseBase;
export interface DeleteScriptRequest extends RequestBase {
    id: Id;


}
export type DeleteScriptResponse = AcknowledgedResponseBase;
export interface ExistsRequest extends RequestBase {
    id: Id;
    index: IndexName;
    preference?: string;
    realtime?: boolean;
    refresh?: boolean;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    stored_fields?: Fields;
    version?: VersionNumber;
    version_type?: VersionType;
}
export type ExistsResponse = boolean;
export interface ExistsSourceRequest extends RequestBase {
    id: Id;
    index: IndexName;
    preference?: string;
    realtime?: boolean;
    refresh?: boolean;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    version?: VersionNumber;
    version_type?: VersionType;
}
export type ExistsSourceResponse = boolean;
export interface ExplainExplanation {
    description: string;
    details: ExplainExplanationDetail[];
    value: float;
}
export interface ExplainExplanationDetail {
    description: string;
    details?: ExplainExplanationDetail[];
    value: float;
}
export interface ExplainRequest extends RequestBase {
    id: Id;
    index: IndexName;
    analyzer?: string;
    analyze_wildcard?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    lenient?: boolean;
    preference?: string;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    stored_fields?: Fields;
    q?: string;
    query?: QueryDslQueryContainer;
}
export interface ExplainResponse<TDocument = unknown> {
    _index: IndexName;
    _id: Id;
    matched: boolean;
    explanation?: ExplainExplanationDetail;
    get?: InlineGet<TDocument>;
}
export interface FieldCapsFieldCapability {
    aggregatable: boolean;
    indices?: Indices;
    meta?: Metadata;
    non_aggregatable_indices?: Indices;
    non_searchable_indices?: Indices;
    searchable: boolean;
    type: string;
    metadata_field?: boolean;
    time_series_dimension?: boolean;
    time_series_metric?: MappingTimeSeriesMetricType;
    non_dimension_indices?: IndexName[];
    metric_conflicts_indices?: IndexName[];
}
export interface FieldCapsRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    include_unmapped?: boolean;
    filters?: string;
    types?: string[];
    include_empty_fields?: boolean;
    fields?: Fields;
    index_filter?: QueryDslQueryContainer;
    runtime_mappings?: MappingRuntimeFields;
}
export interface FieldCapsResponse {
    indices: Indices;
    fields: Record<Field, Record<string, FieldCapsFieldCapability>>;
}
export interface GetGetResult<TDocument = unknown> {
    _index: IndexName;
    fields?: Record<string, any>;
    found: boolean;
    _id: Id;
    _primary_term?: long;
    _routing?: string;
    _seq_no?: SequenceNumber;
    _source?: TDocument;
    _version?: VersionNumber;
}
export interface GetRequest extends RequestBase {
    id: Id;
    index: IndexName;
    force_synthetic_source?: boolean;
    preference?: string;
    realtime?: boolean;
    refresh?: boolean;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    stored_fields?: Fields;
    version?: VersionNumber;
    version_type?: VersionType;
}
export type GetResponse<TDocument = unknown> = GetGetResult<TDocument>;
export interface GetScriptRequest extends RequestBase {
    id: Id;

}
export interface GetScriptResponse {
    _id: Id;
    found: boolean;
    script?: StoredScript;
}
export interface GetScriptContextContext {
    methods: GetScriptContextContextMethod[];
    name: Name;
}
export interface GetScriptContextContextMethod {
    name: Name;
    return_type: string;
    params: GetScriptContextContextMethodParam[];
}
export interface GetScriptContextContextMethodParam {
    name: Name;
    type: string;
}
export interface GetScriptContextRequest extends RequestBase {
}
export interface GetScriptContextResponse {
    contexts: GetScriptContextContext[];
}
export interface GetScriptLanguagesLanguageContext {
    contexts: string[];
    language: ScriptLanguage;
}
export interface GetScriptLanguagesRequest extends RequestBase {
}
export interface GetScriptLanguagesResponse {
    language_contexts: GetScriptLanguagesLanguageContext[];
    types_allowed: string[];
}
export interface GetSourceRequest extends RequestBase {
    id: Id;
    index: IndexName;
    preference?: string;
    realtime?: boolean;
    refresh?: boolean;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    stored_fields?: Fields;
    version?: VersionNumber;
    version_type?: VersionType;
}
export type GetSourceResponse<TDocument = unknown> = TDocument;
export interface HealthReportBaseIndicator {
    status: HealthReportIndicatorHealthStatus;
    symptom: string;
    impacts?: HealthReportImpact[];
    diagnosis?: HealthReportDiagnosis[];
}
export interface HealthReportDiagnosis {
    id: string;
    action: string;
    affected_resources: HealthReportDiagnosisAffectedResources;
    cause: string;
    help_url: string;
}
export interface HealthReportDiagnosisAffectedResources {
    indices?: Indices;
    nodes?: HealthReportIndicatorNode[];
    slm_policies?: string[];
    feature_states?: string[];
    snapshot_repositories?: string[];
}
export interface HealthReportDiskIndicator extends HealthReportBaseIndicator {
    details?: HealthReportDiskIndicatorDetails;
}
export interface HealthReportDiskIndicatorDetails {
    indices_with_readonly_block: long;
    nodes_with_enough_disk_space: long;
    nodes_over_high_watermark: long;
    nodes_over_flood_stage_watermark: long;
    nodes_with_unknown_disk_status: long;
}
export interface HealthReportIlmIndicator extends HealthReportBaseIndicator {
    details?: HealthReportIlmIndicatorDetails;
}
export interface HealthReportIlmIndicatorDetails {
    ilm_status: LifecycleOperationMode;
    policies: long;
    stagnating_indices: integer;
}
export interface HealthReportImpact {
    description: string;
    id: string;
    impact_areas: HealthReportImpactArea[];
    severity: integer;
}
export type HealthReportImpactArea = 'search' | 'ingest' | 'backup' | 'deployment_management';
export type HealthReportIndicatorHealthStatus = 'green' | 'yellow' | 'red' | 'unknown';
export interface HealthReportIndicatorNode {
    name: string | null;
    node_id: string | null;
}
export interface HealthReportIndicators {
    master_is_stable?: HealthReportMasterIsStableIndicator;
    shards_availability?: HealthReportShardsAvailabilityIndicator;
    disk?: HealthReportDiskIndicator;
    repository_integrity?: HealthReportRepositoryIntegrityIndicator;
    ilm?: HealthReportIlmIndicator;
    slm?: HealthReportSlmIndicator;
    shards_capacity?: HealthReportShardsCapacityIndicator;
}
export interface HealthReportMasterIsStableIndicator extends HealthReportBaseIndicator {
    details?: HealthReportMasterIsStableIndicatorDetails;
}
export interface HealthReportMasterIsStableIndicatorClusterFormationNode {
    name?: string;
    node_id: string;
    cluster_formation_message: string;
}
export interface HealthReportMasterIsStableIndicatorDetails {
    current_master: HealthReportIndicatorNode;
    recent_masters: HealthReportIndicatorNode[];
    exception_fetching_history?: HealthReportMasterIsStableIndicatorExceptionFetchingHistory;
    cluster_formation?: HealthReportMasterIsStableIndicatorClusterFormationNode[];
}
export interface HealthReportMasterIsStableIndicatorExceptionFetchingHistory {
    message: string;
    stack_trace: string;
}
export interface HealthReportRepositoryIntegrityIndicator extends HealthReportBaseIndicator {
    details?: HealthReportRepositoryIntegrityIndicatorDetails;
}
export interface HealthReportRepositoryIntegrityIndicatorDetails {
    total_repositories?: long;
    corrupted_repositories?: long;
    corrupted?: string[];
}
export interface HealthReportRequest extends RequestBase {
    feature?: string | string[];

    verbose?: boolean;
    size?: integer;
}
export interface HealthReportResponse {
    cluster_name: string;
    indicators: HealthReportIndicators;
    status?: HealthReportIndicatorHealthStatus;
}
export interface HealthReportShardsAvailabilityIndicator extends HealthReportBaseIndicator {
    details?: HealthReportShardsAvailabilityIndicatorDetails;
}
export interface HealthReportShardsAvailabilityIndicatorDetails {
    creating_primaries: long;
    creating_replicas: long;
    initializing_primaries: long;
    initializing_replicas: long;
    restarting_primaries: long;
    restarting_replicas: long;
    started_primaries: long;
    started_replicas: long;
    unassigned_primaries: long;
    unassigned_replicas: long;
}
export interface HealthReportShardsCapacityIndicator extends HealthReportBaseIndicator {
    details?: HealthReportShardsCapacityIndicatorDetails;
}
export interface HealthReportShardsCapacityIndicatorDetails {
    data: HealthReportShardsCapacityIndicatorTierDetail;
    frozen: HealthReportShardsCapacityIndicatorTierDetail;
}
export interface HealthReportShardsCapacityIndicatorTierDetail {
    max_shards_in_cluster: integer;
    current_used_shards?: integer;
}
export interface HealthReportSlmIndicator extends HealthReportBaseIndicator {
    details?: HealthReportSlmIndicatorDetails;
}
export interface HealthReportSlmIndicatorDetails {
    slm_status: LifecycleOperationMode;
    policies: long;
    unhealthy_policies?: HealthReportSlmIndicatorUnhealthyPolicies;
}
export interface HealthReportSlmIndicatorUnhealthyPolicies {
    count: long;
    invocations_since_last_success?: Record<string, long>;
}
export interface IndexRequest<TDocument = unknown> extends RequestBase {
    id?: Id;
    index: IndexName;
    if_primary_term?: long;
    if_seq_no?: SequenceNumber;
    op_type?: OpType;
    pipeline?: string;
    refresh?: Refresh;
    routing?: Routing;

    version?: VersionNumber;
    version_type?: VersionType;
    wait_for_active_shards?: WaitForActiveShards;
    require_alias?: boolean;
    document?: TDocument;
}
export type IndexResponse = WriteResponseBase;
export interface InfoRequest extends RequestBase {
}
export interface InfoResponse {
    cluster_name: Name;
    cluster_uuid: Uuid;
    name: Name;
    tagline: string;
    version: ElasticsearchVersionInfo;
}
export interface KnnSearchRequest extends RequestBase {
    index: Indices;
    routing?: Routing;
    _source?: SearchSourceConfig;
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    stored_fields?: Fields;
    fields?: Fields;
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    knn: KnnSearchQuery;
}
export interface KnnSearchResponse<TDocument = unknown> {
    took: long;
    timed_out: boolean;
    _shards: ShardStatistics;
    hits: SearchHitsMetadata<TDocument>;
    fields?: Record<string, any>;
    max_score?: double;
}
export interface KnnSearchQuery {
    field: Field;
    query_vector: QueryVector;
    k: integer;
    num_candidates: integer;
}
export interface MgetMultiGetError {
    error: ErrorCause;
    _id: Id;
    _index: IndexName;
}
export interface MgetOperation {
    _id: Id;
    _index?: IndexName;
    routing?: Routing;
    _source?: SearchSourceConfig;
    stored_fields?: Fields;
    version?: VersionNumber;
    version_type?: VersionType;
}
export interface MgetRequest extends RequestBase {
    index?: IndexName;
    force_synthetic_source?: boolean;
    preference?: string;
    realtime?: boolean;
    refresh?: boolean;
    routing?: Routing;
    _source?: SearchSourceConfigParam;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    stored_fields?: Fields;
    docs?: MgetOperation[];
    ids?: Ids;
}
export interface MgetResponse<TDocument = unknown> {
    docs: MgetResponseItem<TDocument>[];
}
export type MgetResponseItem<TDocument = unknown> = GetGetResult<TDocument> | MgetMultiGetError;
export interface MsearchMultiSearchItem<TDocument = unknown> extends SearchResponseBody<TDocument> {
    status?: integer;
}
export interface MsearchMultiSearchResult<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> {
    took: long;
    responses: MsearchResponseItem<TDocument>[];
}
export interface MsearchMultisearchBody {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    aggs?: Record<string, AggregationsAggregationContainer>;
    collapse?: SearchFieldCollapse;
    query?: QueryDslQueryContainer;
    explain?: boolean;
    ext?: Record<string, any>;
    stored_fields?: Fields;
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    knn?: KnnSearch | KnnSearch[];
    from?: integer;
    highlight?: SearchHighlight;
    indices_boost?: Record<IndexName, double>[];
    min_score?: double;
    post_filter?: QueryDslQueryContainer;
    profile?: boolean;
    rescore?: SearchRescore | SearchRescore[];
    script_fields?: Record<string, ScriptField>;
    search_after?: SortResults;
    size?: integer;
    sort?: Sort;
    _source?: SearchSourceConfig;
    fields?: (QueryDslFieldAndFormat | Field)[];
    terminate_after?: long;
    stats?: string[];

    track_scores?: boolean;
    track_total_hits?: SearchTrackHits;
    version?: boolean;
    runtime_mappings?: MappingRuntimeFields;
    seq_no_primary_term?: boolean;
    pit?: SearchPointInTimeReference;
    suggest?: SearchSuggester;
}
export interface MsearchMultisearchHeader {
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    index?: Indices;
    preference?: string;
    request_cache?: boolean;
    routing?: Routing;
    search_type?: SearchType;
    ccs_minimize_roundtrips?: boolean;
    allow_partial_search_results?: boolean;
    ignore_throttled?: boolean;
}
export interface MsearchRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    ccs_minimize_roundtrips?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    max_concurrent_searches?: long;
    max_concurrent_shard_requests?: long;
    pre_filter_shard_size?: long;
    rest_total_hits_as_int?: boolean;
    routing?: Routing;
    search_type?: SearchType;
    typed_keys?: boolean;
    searches?: MsearchRequestItem[];
}
export type MsearchRequestItem = MsearchMultisearchHeader | MsearchMultisearchBody;
export type MsearchResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = MsearchMultiSearchResult<TDocument, TAggregations>;
export type MsearchResponseItem<TDocument = unknown> = MsearchMultiSearchItem<TDocument> | ErrorResponseBase;
export interface MsearchTemplateRequest extends RequestBase {
    index?: Indices;
    ccs_minimize_roundtrips?: boolean;
    max_concurrent_searches?: long;
    search_type?: SearchType;
    rest_total_hits_as_int?: boolean;
    typed_keys?: boolean;
    search_templates?: MsearchTemplateRequestItem[];
}
export type MsearchTemplateRequestItem = MsearchMultisearchHeader | MsearchTemplateTemplateConfig;
export type MsearchTemplateResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = MsearchMultiSearchResult<TDocument, TAggregations>;
export interface MsearchTemplateTemplateConfig {
    explain?: boolean;
    id?: Id;
    params?: Record<string, any>;
    profile?: boolean;
    source?: string;
}
export interface MtermvectorsOperation {
    _id?: Id;
    _index?: IndexName;
    doc?: any;
    fields?: Fields;
    field_statistics?: boolean;
    filter?: TermvectorsFilter;
    offsets?: boolean;
    payloads?: boolean;
    positions?: boolean;
    routing?: Routing;
    term_statistics?: boolean;
    version?: VersionNumber;
    version_type?: VersionType;
}
export interface MtermvectorsRequest extends RequestBase {
    index?: IndexName;
    fields?: Fields;
    field_statistics?: boolean;
    offsets?: boolean;
    payloads?: boolean;
    positions?: boolean;
    preference?: string;
    realtime?: boolean;
    routing?: Routing;
    term_statistics?: boolean;
    version?: VersionNumber;
    version_type?: VersionType;
    docs?: MtermvectorsOperation[];
    ids?: Id[];
}
export interface MtermvectorsResponse {
    docs: MtermvectorsTermVectorsResult[];
}
export interface MtermvectorsTermVectorsResult {
    _id?: Id;
    _index: IndexName;
    _version?: VersionNumber;
    took?: long;
    found?: boolean;
    term_vectors?: Record<Field, TermvectorsTermVector>;
    error?: ErrorCause;
}
export interface OpenPointInTimeRequest extends RequestBase {
    index: Indices;
    keep_alive: Duration;
    ignore_unavailable?: boolean;
    preference?: string;
    routing?: Routing;
    expand_wildcards?: ExpandWildcards;
}
export interface OpenPointInTimeResponse {
    id: Id;
}
export interface PingRequest extends RequestBase {
}
export type PingResponse = boolean;
export interface PutScriptRequest extends RequestBase {
    id: Id;
    context?: Name;


    script: StoredScript;
}
export type PutScriptResponse = AcknowledgedResponseBase;
export interface RankEvalDocumentRating {
    _id: Id;
    _index: IndexName;
    rating: integer;
}
export interface RankEvalRankEvalHit {
    _id: Id;
    _index: IndexName;
    _score: double;
}
export interface RankEvalRankEvalHitItem {
    hit: RankEvalRankEvalHit;
    rating?: double | null;
}
export interface RankEvalRankEvalMetric {
    precision?: RankEvalRankEvalMetricPrecision;
    recall?: RankEvalRankEvalMetricRecall;
    mean_reciprocal_rank?: RankEvalRankEvalMetricMeanReciprocalRank;
    dcg?: RankEvalRankEvalMetricDiscountedCumulativeGain;
    expected_reciprocal_rank?: RankEvalRankEvalMetricExpectedReciprocalRank;
}
export interface RankEvalRankEvalMetricBase {
    k?: integer;
}
export interface RankEvalRankEvalMetricDetail {
    metric_score: double;
    unrated_docs: RankEvalUnratedDocument[];
    hits: RankEvalRankEvalHitItem[];
    metric_details: Record<string, Record<string, any>>;
}
export interface RankEvalRankEvalMetricDiscountedCumulativeGain extends RankEvalRankEvalMetricBase {
    normalize?: boolean;
}
export interface RankEvalRankEvalMetricExpectedReciprocalRank extends RankEvalRankEvalMetricBase {
    maximum_relevance: integer;
}
export interface RankEvalRankEvalMetricMeanReciprocalRank extends RankEvalRankEvalMetricRatingTreshold {
}
export interface RankEvalRankEvalMetricPrecision extends RankEvalRankEvalMetricRatingTreshold {
    ignore_unlabeled?: boolean;
}
export interface RankEvalRankEvalMetricRatingTreshold extends RankEvalRankEvalMetricBase {
    relevant_rating_threshold?: integer;
}
export interface RankEvalRankEvalMetricRecall extends RankEvalRankEvalMetricRatingTreshold {
}
export interface RankEvalRankEvalQuery {
    query: QueryDslQueryContainer;
    size?: integer;
}
export interface RankEvalRankEvalRequestItem {
    id: Id;
    request?: RankEvalRankEvalQuery;
    ratings: RankEvalDocumentRating[];
    template_id?: Id;
    params?: Record<string, any>;
}
export interface RankEvalRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    search_type?: string;
    requests: RankEvalRankEvalRequestItem[];
    metric?: RankEvalRankEvalMetric;
}
export interface RankEvalResponse {
    metric_score: double;
    details: Record<Id, RankEvalRankEvalMetricDetail>;
    failures: Record<string, any>;
}
export interface RankEvalUnratedDocument {
    _id: Id;
    _index: IndexName;
}
export interface ReindexDestination {
    index: IndexName;
    op_type?: OpType;
    pipeline?: string;
    routing?: Routing;
    version_type?: VersionType;
}
export interface ReindexRemoteSource {

    headers?: Record<string, string>;
    host: Host;
    username?: Username;
    password?: Password;

}
export interface ReindexRequest extends RequestBase {
    refresh?: boolean;
    requests_per_second?: float;
    scroll?: Duration;
    slices?: Slices;

    wait_for_active_shards?: WaitForActiveShards;
    wait_for_completion?: boolean;
    require_alias?: boolean;
    conflicts?: Conflicts;
    dest: ReindexDestination;
    max_docs?: long;
    script?: Script | string;
    size?: long;
    source: ReindexSource;
}
export interface ReindexResponse {
    batches?: long;
    created?: long;
    deleted?: long;
    failures?: BulkIndexByScrollFailure[];
    noops?: long;
    retries?: Retries;
    requests_per_second?: float;
    slice_id?: integer;
    task?: TaskId;
    throttled_millis?: EpochTime<UnitMillis>;
    throttled_until_millis?: EpochTime<UnitMillis>;
    timed_out?: boolean;
    took?: DurationValue<UnitMillis>;
    total?: long;
    updated?: long;
    version_conflicts?: long;
}
export interface ReindexSource {
    index: Indices;
    query?: QueryDslQueryContainer;
    remote?: ReindexRemoteSource;
    size?: integer;
    slice?: SlicedScroll;
    sort?: Sort;
    _source?: Fields;
    runtime_mappings?: MappingRuntimeFields;
}
export interface ReindexRethrottleReindexNode extends SpecUtilsBaseNode {
    tasks: Record<TaskId, ReindexRethrottleReindexTask>;
}
export interface ReindexRethrottleReindexStatus {
    batches: long;
    created: long;
    deleted: long;
    noops: long;
    requests_per_second: float;
    retries: Retries;
    throttled?: Duration;
    throttled_millis: DurationValue<UnitMillis>;
    throttled_until?: Duration;
    throttled_until_millis: DurationValue<UnitMillis>;
    total: long;
    updated: long;
    version_conflicts: long;
}
export interface ReindexRethrottleReindexTask {
    action: string;
    cancellable: boolean;
    description: string;
    id: long;
    node: Name;
    running_time_in_nanos: DurationValue<UnitNanos>;
    start_time_in_millis: EpochTime<UnitMillis>;
    status: ReindexRethrottleReindexStatus;
    type: string;
    headers: HttpHeaders;
}
export interface ReindexRethrottleRequest extends RequestBase {
    task_id: Id;
    requests_per_second?: float;
}
export interface ReindexRethrottleResponse {
    nodes: Record<string, ReindexRethrottleReindexNode>;
}
export interface RenderSearchTemplateRequest extends RequestBase {
    id?: Id;
    file?: string;
    params?: Record<string, any>;
    source?: string;
}
export interface RenderSearchTemplateResponse {
    template_output: Record<string, any>;
}
export interface ScriptsPainlessExecutePainlessContextSetup {
    document: any;
    index: IndexName;
    query: QueryDslQueryContainer;
}
export interface ScriptsPainlessExecuteRequest extends RequestBase {
    context?: string;
    context_setup?: ScriptsPainlessExecutePainlessContextSetup;
    script?: Script | string;
}
export interface ScriptsPainlessExecuteResponse<TResult = unknown> {
    result: TResult;
}
export interface ScrollRequest extends RequestBase {
    scroll_id?: ScrollId;
    rest_total_hits_as_int?: boolean;
    scroll?: Duration;
}
export type ScrollResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = SearchResponseBody<TDocument, TAggregations>;
export interface SearchRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    allow_partial_search_results?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    batched_reduce_size?: long;
    ccs_minimize_roundtrips?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    max_concurrent_shard_requests?: long;
    min_compatible_shard_node?: VersionString;
    preference?: string;
    pre_filter_shard_size?: long;
    request_cache?: boolean;
    routing?: Routing;
    scroll?: Duration;
    search_type?: SearchType;
    suggest_field?: Field;
    suggest_mode?: SuggestMode;
    suggest_size?: long;
    suggest_text?: string;
    typed_keys?: boolean;
    rest_total_hits_as_int?: boolean;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    q?: string;
    force_synthetic_source?: boolean;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    /** @alias aggregations */
    aggs?: Record<string, AggregationsAggregationContainer>;
    collapse?: SearchFieldCollapse;
    explain?: boolean;
    ext?: Record<string, any>;
    from?: integer;
    highlight?: SearchHighlight;
    track_total_hits?: SearchTrackHits;
    indices_boost?: Record<IndexName, double>[];
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    knn?: KnnSearch | KnnSearch[];
    rank?: RankContainer;
    min_score?: double;
    post_filter?: QueryDslQueryContainer;
    profile?: boolean;
    query?: QueryDslQueryContainer;
    rescore?: SearchRescore | SearchRescore[];
    retriever?: RetrieverContainer;
    script_fields?: Record<string, ScriptField>;
    search_after?: SortResults;
    size?: integer;
    slice?: SlicedScroll;
    sort?: Sort;
    _source?: SearchSourceConfig;
    fields?: (QueryDslFieldAndFormat | Field)[];
    suggest?: SearchSuggester;
    terminate_after?: long;

    track_scores?: boolean;
    version?: boolean;
    seq_no_primary_term?: boolean;
    stored_fields?: Fields;
    pit?: SearchPointInTimeReference;
    runtime_mappings?: MappingRuntimeFields;
    stats?: string[];
}
export type SearchResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = SearchResponseBody<TDocument, TAggregations>;
export interface SearchResponseBody<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> {
    took: long;
    timed_out: boolean;
    _shards: ShardStatistics;
    hits: SearchHitsMetadata<TDocument>;
    aggregations?: TAggregations;
    _clusters?: ClusterStatistics;
    fields?: Record<string, any>;
    max_score?: double;
    num_reduce_phases?: long;
    profile?: SearchProfile;
    pit_id?: Id;
    _scroll_id?: ScrollId;
    suggest?: Record<SuggestionName, SearchSuggest<TDocument>[]>;
    terminated_early?: boolean;
}
export interface SearchAggregationBreakdown {
    build_aggregation: long;
    build_aggregation_count: long;
    build_leaf_collector: long;
    build_leaf_collector_count: long;
    collect: long;
    collect_count: long;
    initialize: long;
    initialize_count: long;
    post_collection?: long;
    post_collection_count?: long;
    reduce: long;
    reduce_count: long;
}
export interface SearchAggregationProfile {
    breakdown: SearchAggregationBreakdown;
    description: string;
    time_in_nanos: DurationValue<UnitNanos>;
    type: string;
    debug?: SearchAggregationProfileDebug;
    children?: SearchAggregationProfile[];
}
export interface SearchAggregationProfileDebug {
    segments_with_multi_valued_ords?: integer;
    collection_strategy?: string;
    segments_with_single_valued_ords?: integer;
    total_buckets?: integer;
    built_buckets?: integer;
    result_strategy?: string;
    has_filter?: boolean;
    delegate?: string;
    delegate_debug?: SearchAggregationProfileDebug;
    chars_fetched?: integer;
    extract_count?: integer;
    extract_ns?: integer;
    values_fetched?: integer;
    collect_analyzed_ns?: integer;
    collect_analyzed_count?: integer;
    surviving_buckets?: integer;
    ordinals_collectors_used?: integer;
    ordinals_collectors_overhead_too_high?: integer;
    string_hashing_collectors_used?: integer;
    numeric_collectors_used?: integer;
    empty_collectors_used?: integer;
    deferred_aggregators?: string[];
    segments_with_doc_count_field?: integer;
    segments_with_deleted_docs?: integer;
    filters?: SearchAggregationProfileDelegateDebugFilter[];
    segments_counted?: integer;
    segments_collected?: integer;
    map_reducer?: string;
}
export interface SearchAggregationProfileDelegateDebugFilter {
    results_from_metadata?: integer;
    query?: string;
    specialized_for?: string;
    segments_counted_in_constant_time?: integer;
}
export type SearchBoundaryScanner = 'chars' | 'sentence' | 'word';
export interface SearchCollector {
    name: string;
    reason: string;
    time_in_nanos: DurationValue<UnitNanos>;
    children?: SearchCollector[];
}
export interface SearchCompletionContext {
    boost?: double;
    context: SearchContext;
    neighbours?: GeoHashPrecision[];
    precision?: GeoHashPrecision;
    prefix?: boolean;
}
export interface SearchCompletionSuggest<TDocument = unknown> extends SearchSuggestBase {
    options: SearchCompletionSuggestOption<TDocument> | SearchCompletionSuggestOption<TDocument>[];
}
export interface SearchCompletionSuggestOption<TDocument = unknown> {
    collate_match?: boolean;
    contexts?: Record<string, SearchContext[]>;
    fields?: Record<string, any>;
    _id?: string;
    _index?: IndexName;
    _routing?: Routing;
    _score?: double;
    _source?: TDocument;
    text: string;
    score?: double;
}
export interface SearchCompletionSuggester extends SearchSuggesterBase {
    contexts?: Record<Field, SearchCompletionContext | SearchContext | (SearchCompletionContext | SearchContext)[]>;
    fuzzy?: SearchSuggestFuzziness;
    regex?: SearchRegexOptions;
    skip_duplicates?: boolean;
}
export type SearchContext = string | GeoLocation;
export interface SearchDirectGenerator {
    field: Field;
    max_edits?: integer;
    max_inspections?: float;
    max_term_freq?: float;
    min_doc_freq?: float;
    min_word_length?: integer;
    post_filter?: string;
    pre_filter?: string;
    prefix_length?: integer;
    size?: integer;
    suggest_mode?: SuggestMode;
}
export interface SearchFetchProfile {
    type: string;
    description: string;
    time_in_nanos: DurationValue<UnitNanos>;
    breakdown: SearchFetchProfileBreakdown;
    debug?: SearchFetchProfileDebug;
    children?: SearchFetchProfile[];
}
export interface SearchFetchProfileBreakdown {
    load_source?: integer;
    load_source_count?: integer;
    load_stored_fields?: integer;
    load_stored_fields_count?: integer;
    next_reader?: integer;
    next_reader_count?: integer;
    process_count?: integer;
    process?: integer;
}
export interface SearchFetchProfileDebug {
    stored_fields?: string[];
    fast_path?: integer;
}
export interface SearchFieldCollapse {
    field: Field;
    inner_hits?: SearchInnerHits | SearchInnerHits[];
    max_concurrent_group_searches?: integer;
    collapse?: SearchFieldCollapse;
}
export interface SearchFieldSuggester {
    completion?: SearchCompletionSuggester;
    phrase?: SearchPhraseSuggester;
    term?: SearchTermSuggester;
    prefix?: string;
    regex?: string;
    text?: string;
}
export interface SearchHighlight extends SearchHighlightBase {
    encoder?: SearchHighlighterEncoder;
    fields: Record<Field, SearchHighlightField>;
}
export interface SearchHighlightBase {
    type?: SearchHighlighterType;
    boundary_chars?: string;
    boundary_max_scan?: integer;
    boundary_scanner?: SearchBoundaryScanner;
    boundary_scanner_locale?: string;
    force_source?: boolean;
    fragmenter?: SearchHighlighterFragmenter;
    fragment_size?: integer;
    highlight_filter?: boolean;
    highlight_query?: QueryDslQueryContainer;
    max_fragment_length?: integer;
    max_analyzed_offset?: integer;
    no_match_size?: integer;
    number_of_fragments?: integer;
    options?: Record<string, any>;
    order?: SearchHighlighterOrder;
    phrase_limit?: integer;
    post_tags?: string[];
    pre_tags?: string[];
    require_field_match?: boolean;
    tags_schema?: SearchHighlighterTagsSchema;
}
export interface SearchHighlightField extends SearchHighlightBase {
    fragment_offset?: integer;
    matched_fields?: Fields;
    analyzer?: AnalysisAnalyzer;
}
export type SearchHighlighterEncoder = 'default' | 'html';
export type SearchHighlighterFragmenter = 'simple' | 'span';
export type SearchHighlighterOrder = 'score';
export type SearchHighlighterTagsSchema = 'styled';
export type SearchHighlighterType = 'plain' | 'fvh' | 'unified' | string;
export interface SearchHit<TDocument = unknown> {
    _index: IndexName;
    _id?: Id;
    _score?: double | null;
    _explanation?: ExplainExplanation;
    fields?: Record<string, any>;
    highlight?: Record<string, string[]>;
    inner_hits?: Record<string, SearchInnerHitsResult>;
    matched_queries?: string[];
    _nested?: SearchNestedIdentity;
    _ignored?: string[];
    ignored_field_values?: Record<string, string[]>;
    _shard?: string;
    _node?: string;
    _routing?: string;
    _source?: TDocument;
    _rank?: integer;
    _seq_no?: SequenceNumber;
    _primary_term?: long;
    _version?: VersionNumber;
    sort?: SortResults;
}
export interface SearchHitsMetadata<T = unknown> {
    total?: SearchTotalHits | long;
    hits: SearchHit<T>[];
    max_score?: double | null;
}
export interface SearchInnerHits {
    name?: Name;
    size?: integer;
    from?: integer;
    collapse?: SearchFieldCollapse;
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    explain?: boolean;
    highlight?: SearchHighlight;
    ignore_unmapped?: boolean;
    script_fields?: Record<Field, ScriptField>;
    seq_no_primary_term?: boolean;
    fields?: Fields;
    sort?: Sort;
    _source?: SearchSourceConfig;
    stored_fields?: Fields;
    track_scores?: boolean;
    version?: boolean;
}
export interface SearchInnerHitsResult {
    hits: SearchHitsMetadata<any>;
}
export interface SearchLaplaceSmoothingModel {
    alpha: double;
}
export interface SearchLearningToRank {
    model_id: string;
    params?: Record<string, any>;
}
export interface SearchLinearInterpolationSmoothingModel {
    bigram_lambda: double;
    trigram_lambda: double;
    unigram_lambda: double;
}
export interface SearchNestedIdentity {
    field: Field;
    offset: integer;
    _nested?: SearchNestedIdentity;
}
export interface SearchPhraseSuggest extends SearchSuggestBase {
    options: SearchPhraseSuggestOption | SearchPhraseSuggestOption[];
}
export interface SearchPhraseSuggestCollate {
    params?: Record<string, any>;
    prune?: boolean;
    query: SearchPhraseSuggestCollateQuery;
}
export interface SearchPhraseSuggestCollateQuery {
    id?: Id;
    source?: string;
}
export interface SearchPhraseSuggestHighlight {
    post_tag: string;
    pre_tag: string;
}
export interface SearchPhraseSuggestOption {
    text: string;
    score: double;
    highlighted?: string;
    collate_match?: boolean;
}
export interface SearchPhraseSuggester extends SearchSuggesterBase {
    collate?: SearchPhraseSuggestCollate;
    confidence?: double;
    direct_generator?: SearchDirectGenerator[];
    force_unigrams?: boolean;
    gram_size?: integer;
    highlight?: SearchPhraseSuggestHighlight;
    max_errors?: double;
    real_word_error_likelihood?: double;
    separator?: string;
    shard_size?: integer;
    smoothing?: SearchSmoothingModelContainer;
    text?: string;
    token_limit?: integer;
}
export interface SearchPointInTimeReference {
    id: Id;
    keep_alive?: Duration;
}
export interface SearchProfile {
    shards: SearchShardProfile[];
}
export interface SearchQueryBreakdown {
    advance: long;
    advance_count: long;
    build_scorer: long;
    build_scorer_count: long;
    create_weight: long;
    create_weight_count: long;
    match: long;
    match_count: long;
    shallow_advance: long;
    shallow_advance_count: long;
    next_doc: long;
    next_doc_count: long;
    score: long;
    score_count: long;
    compute_max_score: long;
    compute_max_score_count: long;
    set_min_competitive_score: long;
    set_min_competitive_score_count: long;
}
export interface SearchQueryProfile {
    breakdown: SearchQueryBreakdown;
    description: string;
    time_in_nanos: DurationValue<UnitNanos>;
    type: string;
    children?: SearchQueryProfile[];
}
export interface SearchRegexOptions {
    flags?: integer | string;
    max_determinized_states?: integer;
}
export interface SearchRescore {
    window_size?: integer;
    query?: SearchRescoreQuery;
    learning_to_rank?: SearchLearningToRank;
}
export interface SearchRescoreQuery {
    rescore_query: QueryDslQueryContainer;
    query_weight?: double;
    rescore_query_weight?: double;
    score_mode?: SearchScoreMode;
}
export type SearchScoreMode = 'avg' | 'max' | 'min' | 'multiply' | 'total';
export interface SearchSearchProfile {
    collector: SearchCollector[];
    query: SearchQueryProfile[];
    rewrite_time: long;
}
export interface SearchShardProfile {
    aggregations: SearchAggregationProfile[];
    id: string;
    searches: SearchSearchProfile[];
    fetch?: SearchFetchProfile;
}
export interface SearchSmoothingModelContainer {
    laplace?: SearchLaplaceSmoothingModel;
    linear_interpolation?: SearchLinearInterpolationSmoothingModel;
    stupid_backoff?: SearchStupidBackoffSmoothingModel;
}
export type SearchSourceConfig = boolean | SearchSourceFilter | Fields;
export type SearchSourceConfigParam = boolean | Fields;
export interface SearchSourceFilter {
    excludes?: Fields;
    exclude?: Fields;
    includes?: Fields;
    include?: Fields;
}
export type SearchStringDistance = 'internal' | 'damerau_levenshtein' | 'levenshtein' | 'jaro_winkler' | 'ngram';
export interface SearchStupidBackoffSmoothingModel {
    discount: double;
}
export type SearchSuggest<TDocument = unknown> = SearchCompletionSuggest<TDocument> | SearchPhraseSuggest | SearchTermSuggest;
export interface SearchSuggestBase {
    length: integer;
    offset: integer;
    text: string;
}
export interface SearchSuggestFuzziness {
    fuzziness?: Fuzziness;
    min_length?: integer;
    prefix_length?: integer;
    transpositions?: boolean;
    unicode_aware?: boolean;
}
export type SearchSuggestSort = 'score' | 'frequency';
export interface SearchSuggesterKeys {
    text?: string;
}
export type SearchSuggester = SearchSuggesterKeys & {
    [property: string]: SearchFieldSuggester | string;
};
export interface SearchSuggesterBase {
    field: Field;
    analyzer?: string;
    size?: integer;
}
export interface SearchTermSuggest extends SearchSuggestBase {
    options: SearchTermSuggestOption | SearchTermSuggestOption[];
}
export interface SearchTermSuggestOption {
    text: string;
    score: double;
    freq: long;
    highlighted?: string;
    collate_match?: boolean;
}
export interface SearchTermSuggester extends SearchSuggesterBase {
    lowercase_terms?: boolean;
    max_edits?: integer;
    max_inspections?: integer;
    max_term_freq?: float;
    min_doc_freq?: float;
    min_word_length?: integer;
    prefix_length?: integer;
    shard_size?: integer;
    sort?: SearchSuggestSort;
    string_distance?: SearchStringDistance;
    suggest_mode?: SuggestMode;
    text?: string;
}
export interface SearchTotalHits {
    relation: SearchTotalHitsRelation;
    value: long;
}
export type SearchTotalHitsRelation = 'eq' | 'gte';
export type SearchTrackHits = boolean | integer;
export interface SearchMvtRequest extends RequestBase {
    index: Indices;
    field: Field;
    zoom: SearchMvtZoomLevel;
    x: SearchMvtCoordinate;
    y: SearchMvtCoordinate;
    aggs?: Record<string, AggregationsAggregationContainer>;
    buffer?: integer;
    exact_bounds?: boolean;
    extent?: integer;
    fields?: Fields;
    grid_agg?: SearchMvtGridAggregationType;
    grid_precision?: integer;
    grid_type?: SearchMvtGridType;
    query?: QueryDslQueryContainer;
    runtime_mappings?: MappingRuntimeFields;
    size?: integer;
    sort?: Sort;
    track_total_hits?: SearchTrackHits;
    with_labels?: boolean;
}
export type SearchMvtResponse = MapboxVectorTiles;
export type SearchMvtCoordinate = integer;
export type SearchMvtGridAggregationType = 'geotile' | 'geohex';
export type SearchMvtGridType = 'grid' | 'point' | 'centroid';
export type SearchMvtZoomLevel = integer;
export interface SearchShardsRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    local?: boolean;
    preference?: string;
    routing?: Routing;
}
export interface SearchShardsResponse {
    nodes: Record<string, NodeAttributes>;
    shards: NodeShard[][];
    indices: Record<IndexName, SearchShardsShardStoreIndex>;
}
export interface SearchShardsShardStoreIndex {
    aliases?: Name[];
    filter?: QueryDslQueryContainer;
}
export interface SearchTemplateRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    ccs_minimize_roundtrips?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    preference?: string;
    routing?: Routing;
    scroll?: Duration;
    search_type?: SearchType;
    rest_total_hits_as_int?: boolean;
    typed_keys?: boolean;
    explain?: boolean;
    id?: Id;
    params?: Record<string, any>;
    profile?: boolean;
    source?: string;
}
export interface SearchTemplateResponse<TDocument = unknown> {
    took: long;
    timed_out: boolean;
    _shards: ShardStatistics;
    hits: SearchHitsMetadata<TDocument>;
    aggregations?: Record<AggregateName, AggregationsAggregate>;
    _clusters?: ClusterStatistics;
    fields?: Record<string, any>;
    max_score?: double;
    num_reduce_phases?: long;
    profile?: SearchProfile;
    pit_id?: Id;
    _scroll_id?: ScrollId;
    suggest?: Record<SuggestionName, SearchSuggest<TDocument>[]>;
    terminated_early?: boolean;
}
export interface TermsEnumRequest extends RequestBase {
    index: IndexName;
    field: Field;
    size?: integer;

    case_insensitive?: boolean;
    index_filter?: QueryDslQueryContainer;
    string?: string;
    search_after?: string;
}
export interface TermsEnumResponse {
    _shards: ShardStatistics;
    terms: string[];
    complete: boolean;
}
export interface TermvectorsFieldStatistics {
    doc_count: integer;
    sum_doc_freq: long;
    sum_ttf: long;
}
export interface TermvectorsFilter {
    max_doc_freq?: integer;
    max_num_terms?: integer;
    max_term_freq?: integer;
    max_word_length?: integer;
    min_doc_freq?: integer;
    min_term_freq?: integer;
    min_word_length?: integer;
}
export interface TermvectorsRequest<TDocument = unknown> extends RequestBase {
    index: IndexName;
    id?: Id;
    fields?: Fields;
    field_statistics?: boolean;
    offsets?: boolean;
    payloads?: boolean;
    positions?: boolean;
    preference?: string;
    realtime?: boolean;
    routing?: Routing;
    term_statistics?: boolean;
    version?: VersionNumber;
    version_type?: VersionType;
    doc?: TDocument;
    filter?: TermvectorsFilter;
    per_field_analyzer?: Record<Field, string>;
}
export interface TermvectorsResponse {
    found: boolean;
    _id?: Id;
    _index: IndexName;
    term_vectors?: Record<Field, TermvectorsTermVector>;
    took: long;
    _version: VersionNumber;
}
export interface TermvectorsTerm {
    doc_freq?: integer;
    score?: double;
    term_freq: integer;
    tokens?: TermvectorsToken[];
    ttf?: integer;
}
export interface TermvectorsTermVector {
    field_statistics?: TermvectorsFieldStatistics;
    terms: Record<string, TermvectorsTerm>;
}
export interface TermvectorsToken {
    end_offset?: integer;
    payload?: string;
    position: integer;
    start_offset?: integer;
}
export interface UpdateRequest<TDocument = unknown, TPartialDocument = unknown> extends RequestBase {
    id: Id;
    index: IndexName;
    if_primary_term?: long;
    if_seq_no?: SequenceNumber;
    lang?: string;
    refresh?: Refresh;
    require_alias?: boolean;
    retry_on_conflict?: integer;
    routing?: Routing;

    wait_for_active_shards?: WaitForActiveShards;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    detect_noop?: boolean;
    doc?: TPartialDocument;
    doc_as_upsert?: boolean;
    script?: Script | string;
    scripted_upsert?: boolean;
    _source?: SearchSourceConfig;
    upsert?: TDocument;
}
export type UpdateResponse<TDocument = unknown> = UpdateUpdateWriteResponseBase<TDocument>;
export interface UpdateUpdateWriteResponseBase<TDocument = unknown> extends WriteResponseBase {
    get?: InlineGet<TDocument>;
}
export interface UpdateByQueryRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    from?: long;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    pipeline?: string;
    preference?: string;
    refresh?: boolean;
    request_cache?: boolean;
    requests_per_second?: float;
    routing?: Routing;
    scroll?: Duration;
    scroll_size?: long;

    search_type?: SearchType;
    slices?: Slices;
    sort?: string[];
    stats?: string[];
    terminate_after?: long;

    version?: boolean;
    version_type?: boolean;
    wait_for_active_shards?: WaitForActiveShards;
    wait_for_completion?: boolean;
    max_docs?: long;
    query?: QueryDslQueryContainer;
    script?: Script | string;
    slice?: SlicedScroll;
    conflicts?: Conflicts;
}
export interface UpdateByQueryResponse {
    batches?: long;
    failures?: BulkIndexByScrollFailure[];
    noops?: long;
    deleted?: long;
    requests_per_second?: float;
    retries?: Retries;
    task?: TaskId;
    timed_out?: boolean;
    took?: DurationValue<UnitMillis>;
    total?: long;
    updated?: long;
    version_conflicts?: long;
    throttled?: Duration;
    throttled_millis?: DurationValue<UnitMillis>;
    throttled_until?: Duration;
    throttled_until_millis?: DurationValue<UnitMillis>;
}
export interface UpdateByQueryRethrottleRequest extends RequestBase {
    task_id: Id;
    requests_per_second?: float;
}
export interface UpdateByQueryRethrottleResponse {
    nodes: Record<string, UpdateByQueryRethrottleUpdateByQueryRethrottleNode>;
}
export interface UpdateByQueryRethrottleUpdateByQueryRethrottleNode extends SpecUtilsBaseNode {
    tasks: Record<TaskId, TasksTaskInfo>;
}
export interface SpecUtilsBaseNode {
    attributes: Record<string, string>;
    host: Host;
    ip: Ip;
    name: Name;
    roles?: NodeRoles;
    transport_address: TransportAddress;
}
export type SpecUtilsNullValue = null;
export type SpecUtilsPipeSeparatedFlags<T = unknown> = T | string;
export type SpecUtilsStringified<T = unknown> = T | string;
export type SpecUtilsWithNullValue<T = unknown> = T | SpecUtilsNullValue;
export interface AcknowledgedResponseBase {
    acknowledged: boolean;
}
export type AggregateName = string;
export interface BulkIndexByScrollFailure {
    cause: ErrorCause;
    id: Id;
    index: IndexName;
    status: integer;
    type: string;
}
export interface BulkStats {
    total_operations: long;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
    total_size?: ByteSize;
    total_size_in_bytes: long;
    avg_time?: Duration;
    avg_time_in_millis: DurationValue<UnitMillis>;
    avg_size?: ByteSize;
    avg_size_in_bytes: long;
}
export type ByteSize = long | string;
export type Bytes = 'b' | 'kb' | 'mb' | 'gb' | 'tb' | 'pb';
export type CategoryId = string;
export type ClusterAlias = string;
export interface ClusterDetails {
    status: ClusterSearchStatus;
    indices: string;
    took?: DurationValue<UnitMillis>;
    timed_out: boolean;
    _shards?: ShardStatistics;
    failures?: ShardFailure[];
}
export type ClusterInfoTarget = '_all' | 'http' | 'ingest' | 'thread_pool' | 'script';
export type ClusterInfoTargets = ClusterInfoTarget | ClusterInfoTarget[];
export type ClusterSearchStatus = 'running' | 'successful' | 'partial' | 'skipped' | 'failed';
export interface ClusterStatistics {
    skipped: integer;
    successful: integer;
    total: integer;
    running: integer;
    partial: integer;
    failed: integer;
    details?: Record<ClusterAlias, ClusterDetails>;
}
export interface CompletionStats {
    size_in_bytes: long;
    size?: ByteSize;
    fields?: Record<Field, FieldSizeUsage>;
}
export type Conflicts = 'abort' | 'proceed';
export interface CoordsGeoBounds {
    top: double;
    bottom: double;
    left: double;
    right: double;
}
export type DFIIndependenceMeasure = 'standardized' | 'saturated' | 'chisquared';
export type DFRAfterEffect = 'no' | 'b' | 'l';
export type DFRBasicModel = 'be' | 'd' | 'g' | 'if' | 'in' | 'ine' | 'p';
export type DataStreamName = string;
export type DataStreamNames = DataStreamName | DataStreamName[];
export type DateFormat = string;
export type DateMath = string | Date;
export type DateTime = string | EpochTime<UnitMillis> | Date;
export type Distance = string;
export type DistanceUnit = 'in' | 'ft' | 'yd' | 'mi' | 'nmi' | 'km' | 'm' | 'cm' | 'mm';
export interface DocStats {
    count: long;
    deleted?: long;
}
export type Duration = string | -1 | 0;
export type DurationLarge = string;
export type DurationValue<Unit = unknown> = Unit;
export interface ElasticsearchVersionInfo {
    build_date: DateTime;
    build_flavor: string;
    build_hash: string;
    build_snapshot: boolean;
    build_type: string;
    lucene_version: VersionString;
    minimum_index_compatibility_version: VersionString;
    minimum_wire_compatibility_version: VersionString;
    number: string;
}
export interface ElasticsearchVersionMinInfo {
    build_flavor: string;
    minimum_index_compatibility_version: VersionString;
    minimum_wire_compatibility_version: VersionString;
    number: string;
}
export interface EmptyObject {
}
export type EpochTime<Unit = unknown> = Unit;
export interface ErrorCauseKeys {
    type: string;
    reason?: string;
    stack_trace?: string;
    caused_by?: ErrorCause;
    root_cause?: ErrorCause[];
    suppressed?: ErrorCause[];
}
export type ErrorCause = ErrorCauseKeys & {
    [property: string]: any;
};
export interface ErrorResponseBase {
    error: ErrorCause;
    status: integer;
}
export type EsqlColumns = ArrayBuffer;
export type ExpandWildcard = 'all' | 'open' | 'closed' | 'hidden' | 'none';
export type ExpandWildcards = ExpandWildcard | ExpandWildcard[];
export type Field = string;
export interface FieldMemoryUsage {
    memory_size?: ByteSize;
    memory_size_in_bytes: long;
}
export interface FieldSizeUsage {
    size?: ByteSize;
    size_in_bytes: long;
}
export interface FieldSort {
    missing?: AggregationsMissing;
    mode?: SortMode;
    nested?: NestedSortValue;
    order?: SortOrder;
    unmapped_type?: MappingFieldType;
    numeric_type?: FieldSortNumericType;
    format?: string;
}
export type FieldSortNumericType = 'long' | 'double' | 'date' | 'date_nanos';
export type FieldValue = long | double | string | boolean | null | any;
export interface FielddataStats {
    evictions?: long;
    memory_size?: ByteSize;
    memory_size_in_bytes: long;
    fields?: Record<Field, FieldMemoryUsage>;
}
export type Fields = Field | Field[];
export interface FlushStats {
    periodic: long;
    total: long;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export type Fuzziness = string | integer;
export type GeoBounds = CoordsGeoBounds | TopLeftBottomRightGeoBounds | TopRightBottomLeftGeoBounds | WktGeoBounds;
export interface GeoDistanceSortKeys {
    mode?: SortMode;
    distance_type?: GeoDistanceType;
    ignore_unmapped?: boolean;
    order?: SortOrder;
    unit?: DistanceUnit;
    nested?: NestedSortValue;
}
export type GeoDistanceSort = GeoDistanceSortKeys & {
    [property: string]: GeoLocation | GeoLocation[] | SortMode | GeoDistanceType | boolean | SortOrder | DistanceUnit | NestedSortValue;
};
export type GeoDistanceType = 'arc' | 'plane';
export type GeoHash = string;
export interface GeoHashLocation {
    geohash: GeoHash;
}
export type GeoHashPrecision = number | string;
export type GeoHexCell = string;
export interface GeoLine {
    type: string;
    coordinates: double[][];
}
export type GeoLocation = LatLonGeoLocation | GeoHashLocation | double[] | string;
export type GeoShape = any;
export type GeoShapeRelation = 'intersects' | 'disjoint' | 'within' | 'contains';
export type GeoTile = string;
export type GeoTilePrecision = number;
export interface GetStats {
    current: long;
    exists_time?: Duration;
    exists_time_in_millis: DurationValue<UnitMillis>;
    exists_total: long;
    missing_time?: Duration;
    missing_time_in_millis: DurationValue<UnitMillis>;
    missing_total: long;
    time?: Duration;
    time_in_millis: DurationValue<UnitMillis>;
    total: long;
}
export type HealthStatus = 'green' | 'GREEN' | 'yellow' | 'YELLOW' | 'red' | 'RED';
export type Host = string;
export type HttpHeaders = Record<string, string | string[]>;
export type IBDistribution = 'll' | 'spl';
export type IBLambda = 'df' | 'ttf';
export type Id = string;
export type Ids = Id | Id[];
export type IndexAlias = string;
export type IndexName = string;
export type IndexPattern = string;
export type IndexPatterns = IndexPattern[];
export interface IndexingStats {
    index_current: long;
    delete_current: long;
    delete_time?: Duration;
    delete_time_in_millis: DurationValue<UnitMillis>;
    delete_total: long;
    is_throttled: boolean;
    noop_update_total: long;
    throttle_time?: Duration;
    throttle_time_in_millis: DurationValue<UnitMillis>;
    index_time?: Duration;
    index_time_in_millis: DurationValue<UnitMillis>;
    index_total: long;
    index_failed: long;
    types?: Record<string, IndexingStats>;
    write_load?: double;
}
export type Indices = IndexName | IndexName[];
export interface IndicesOptions {
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    ignore_throttled?: boolean;
}
export interface IndicesResponseBase extends AcknowledgedResponseBase {
    _shards?: ShardStatistics;
}
export interface InlineGetKeys<TDocument = unknown> {
    fields?: Record<string, any>;
    found: boolean;
    _seq_no?: SequenceNumber;
    _primary_term?: long;
    _routing?: Routing;
    _source?: TDocument;
}
export type InlineGet<TDocument = unknown> = InlineGetKeys<TDocument> & {
    [property: string]: any;
};
export type Ip = string;
export interface KnnQuery extends QueryDslQueryBase {
    field: Field;
    query_vector?: QueryVector;
    query_vector_builder?: QueryVectorBuilder;
    num_candidates?: integer;
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    similarity?: float;
}
export interface KnnRetriever extends RetrieverBase {
    field: string;
    query_vector?: QueryVector;
    query_vector_builder?: QueryVectorBuilder;
    k: integer;
    num_candidates: integer;
    similarity?: float;
}
export interface KnnSearch {
    field: Field;
    query_vector?: QueryVector;
    query_vector_builder?: QueryVectorBuilder;
    k?: integer;
    num_candidates?: integer;
    boost?: float;
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    similarity?: float;
    inner_hits?: SearchInnerHits;
}
export interface LatLonGeoLocation {
    lat: double;
    lon: double;
}
export type Level = 'cluster' | 'indices' | 'shards';
export type LifecycleOperationMode = 'RUNNING' | 'STOPPING' | 'STOPPED';
export type MapboxVectorTiles = ArrayBuffer;
export interface MergesStats {
    current: long;
    current_docs: long;
    current_size?: string;
    current_size_in_bytes: long;
    total: long;
    total_auto_throttle?: string;
    total_auto_throttle_in_bytes: long;
    total_docs: long;
    total_size?: string;
    total_size_in_bytes: long;
    total_stopped_time?: Duration;
    total_stopped_time_in_millis: DurationValue<UnitMillis>;
    total_throttled_time?: Duration;
    total_throttled_time_in_millis: DurationValue<UnitMillis>;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export type Metadata = Record<string, any>;
export type Metrics = string | string[];
export type MinimumShouldMatch = integer | string;
export type MultiTermQueryRewrite = string;
export type Name = string;
export type Names = Name | Name[];
export type Namespace = string;
export interface NestedSortValue {
    filter?: QueryDslQueryContainer;
    max_children?: integer;
    nested?: NestedSortValue;
    path: Field;
}
export interface NodeAttributes {
    attributes: Record<string, string>;
    ephemeral_id: Id;
    id?: NodeId;
    name: NodeName;
    transport_address: TransportAddress;
    roles?: NodeRoles;
    external_id?: string;
}
export type NodeId = string;
export type NodeIds = NodeId | NodeId[];
export type NodeName = string;
export type NodeRole = 'master' | 'data' | 'data_cold' | 'data_content' | 'data_frozen' | 'data_hot' | 'data_warm' | 'client' | 'ingest' | 'ml' | 'voting_only' | 'transform' | 'remote_cluster_client' | 'coordinating_only';
export type NodeRoles = NodeRole[];
export interface NodeShard {
    state: IndicesStatsShardRoutingState;
    primary: boolean;
    node?: NodeName;
    shard: integer;
    index: IndexName;
    allocation_id?: Record<string, Id>;
    recovery_source?: Record<string, Id>;
    unassigned_info?: ClusterAllocationExplainUnassignedInformation;
    relocating_node?: NodeId | null;
    relocation_failure_info?: RelocationFailureInfo;
}
export interface NodeStatistics {
    failures?: ErrorCause[];
    total: integer;
    successful: integer;
    failed: integer;
}
export type Normalization = 'no' | 'h1' | 'h2' | 'h3' | 'z';
export type OpType = 'index' | 'create';
export type Password = string;
export type Percentage = string | float;
export type PipelineName = string;
export interface PluginStats {
    classname: string;
    description: string;
    elasticsearch_version: VersionString;
    extended_plugins: string[];
    has_native_controller: boolean;
    java_version: VersionString;
    name: Name;
    version: VersionString;
    licensed: boolean;
}
export type PropertyName = string;
export interface QueryCacheStats {
    cache_count: long;
    cache_size: long;
    evictions: long;
    hit_count: long;
    memory_size?: ByteSize;
    memory_size_in_bytes: long;
    miss_count: long;
    total_count: long;
}
export type QueryVector = float[];
export interface QueryVectorBuilder {
    text_embedding?: TextEmbedding;
}
export interface RRFRetriever extends RetrieverBase {
    retrievers: RetrieverContainer[];
    rank_constant?: integer;
    rank_window_size?: integer;
}
export interface RankBase {
}
export interface RankContainer {
    rrf?: RrfRank;
}
export interface RecoveryStats {
    current_as_source: long;
    current_as_target: long;
    throttle_time?: Duration;
    throttle_time_in_millis: DurationValue<UnitMillis>;
}
export type Refresh = boolean | 'true' | 'false' | 'wait_for';
export interface RefreshStats {
    external_total: long;
    external_total_time_in_millis: DurationValue<UnitMillis>;
    listeners: long;
    total: long;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export type RelationName = string;
export interface RelocationFailureInfo {
    failed_attempts: integer;
}
export interface RequestBase extends SpecUtilsCommonQueryParameters {
}
export interface RequestCacheStats {
    evictions: long;
    hit_count: long;
    memory_size?: string;
    memory_size_in_bytes: long;
    miss_count: long;
}
export type Result = 'created' | 'updated' | 'deleted' | 'not_found' | 'noop';
export interface Retries {
    bulk: long;
    search: long;
}
export interface RetrieverBase {
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
}
export interface RetrieverContainer {
    standard?: StandardRetriever;
    knn?: KnnRetriever;
    rrf?: RRFRetriever;
}
export type Routing = string;
export interface RrfRank {
    rank_constant?: long;
    rank_window_size?: long;
}
export type ScalarValue = long | double | string | boolean | null;
export interface ScoreSort {
    order?: SortOrder;
}
export interface Script {
    source?: string;
    id?: Id;
    params?: Record<string, any>;
    lang?: ScriptLanguage;
    options?: Record<string, string>;
}
export interface ScriptField {
    script: Script | string;
    ignore_failure?: boolean;
}
export type ScriptLanguage = 'painless' | 'expression' | 'mustache' | 'java' | string;
export interface ScriptSort {
    order?: SortOrder;
    script: Script | string;
    type?: ScriptSortType;
    mode?: SortMode;
    nested?: NestedSortValue;
}
export type ScriptSortType = 'string' | 'number' | 'version';
export interface ScriptTransform {
    lang?: string;
    params?: Record<string, any>;
    source?: string;
    id?: string;
}
export type ScrollId = string;
export type ScrollIds = ScrollId | ScrollId[];
export interface SearchStats {
    fetch_current: long;
    fetch_time?: Duration;
    fetch_time_in_millis: DurationValue<UnitMillis>;
    fetch_total: long;
    open_contexts?: long;
    query_current: long;
    query_time?: Duration;
    query_time_in_millis: DurationValue<UnitMillis>;
    query_total: long;
    scroll_current: long;
    scroll_time?: Duration;
    scroll_time_in_millis: DurationValue<UnitMillis>;
    scroll_total: long;
    suggest_current: long;
    suggest_time?: Duration;
    suggest_time_in_millis: DurationValue<UnitMillis>;
    suggest_total: long;
    groups?: Record<string, SearchStats>;
}
export interface SearchTransform {
    request: WatcherSearchInputRequestDefinition;

}
export type SearchType = 'query_then_fetch' | 'dfs_query_then_fetch';
export interface SegmentsStats {
    count: integer;
    doc_values_memory?: ByteSize;
    doc_values_memory_in_bytes: long;
    file_sizes: Record<string, IndicesStatsShardFileSizeInfo>;
    fixed_bit_set?: ByteSize;
    fixed_bit_set_memory_in_bytes: long;
    index_writer_memory?: ByteSize;
    index_writer_max_memory_in_bytes?: long;
    index_writer_memory_in_bytes: long;
    max_unsafe_auto_id_timestamp: long;
    memory?: ByteSize;
    memory_in_bytes: long;
    norms_memory?: ByteSize;
    norms_memory_in_bytes: long;
    points_memory?: ByteSize;
    points_memory_in_bytes: long;
    stored_memory?: ByteSize;
    stored_fields_memory_in_bytes: long;
    terms_memory_in_bytes: long;
    terms_memory?: ByteSize;
    term_vectory_memory?: ByteSize;
    term_vectors_memory_in_bytes: long;
    version_map_memory?: ByteSize;
    version_map_memory_in_bytes: long;
}
export type SequenceNumber = long;
export type Service = string;
export interface ShardFailure {
    index?: IndexName;
    node?: string;
    reason: ErrorCause;
    shard: integer;
    status?: string;
}
export interface ShardStatistics {
    failed: uint;
    successful: uint;
    total: uint;
    failures?: ShardFailure[];
    skipped?: uint;
}
export interface ShardsOperationResponseBase {
    _shards: ShardStatistics;
}
export interface SlicedScroll {
    field?: Field;
    id: Id;
    max: integer;
}
export type Slices = integer | SlicesCalculation;
export type SlicesCalculation = 'auto';
export type Sort = SortCombinations | SortCombinations[];
export type SortCombinations = Field | SortOptions;
export type SortMode = 'min' | 'max' | 'sum' | 'avg' | 'median';
export interface SortOptionsKeys {
    _score?: ScoreSort;
    _doc?: ScoreSort;
    _geo_distance?: GeoDistanceSort;
    _script?: ScriptSort;
}
export type SortOptions = SortOptionsKeys & {
    [property: string]: FieldSort | SortOrder | ScoreSort | GeoDistanceSort | ScriptSort;
};
export type SortOrder = 'asc' | 'desc';
export type SortResults = FieldValue[];
export interface StandardRetriever extends RetrieverBase {
    query?: QueryDslQueryContainer;
    search_after?: SortResults;
    terminate_after?: integer;
    sort?: Sort;
    min_score?: float;
    collapse?: SearchFieldCollapse;
}
export interface StoreStats {
    size?: ByteSize;
    size_in_bytes: long;
    reserved?: ByteSize;
    reserved_in_bytes: long;
    total_data_set_size?: ByteSize;
    total_data_set_size_in_bytes?: long;
}
export interface StoredScript {
    lang: ScriptLanguage;
    options?: Record<string, string>;
    source: string;
}
export type SuggestMode = 'missing' | 'popular' | 'always';
export type SuggestionName = string;
export interface TaskFailure {
    task_id: long;
    node_id: NodeId;
    status: string;
    reason: ErrorCause;
}
export type TaskId = string | integer;
export interface TextEmbedding {
    model_id: string;
    model_text: string;
}
export type ThreadType = 'cpu' | 'wait' | 'block' | 'gpu' | 'mem';
export type TimeOfDay = string;
export type TimeUnit = 'nanos' | 'micros' | 'ms' | 's' | 'm' | 'h' | 'd';
export type TimeZone = string;
export interface TopLeftBottomRightGeoBounds {
    top_left: GeoLocation;
    bottom_right: GeoLocation;
}
export interface TopRightBottomLeftGeoBounds {
    top_right: GeoLocation;
    bottom_left: GeoLocation;
}
export interface TransformContainer {
    chain?: TransformContainer[];
    script?: ScriptTransform;
    search?: SearchTransform;
}
export interface TranslogStats {
    earliest_last_modified_age: long;
    operations: long;
    size?: string;
    size_in_bytes: long;
    uncommitted_operations: integer;
    uncommitted_size?: string;
    uncommitted_size_in_bytes: long;
}
export type TransportAddress = string;
export type UnitFloatMillis = double;
export type UnitMillis = long;
export type UnitNanos = long;
export type UnitSeconds = long;
export type Username = string;
export type Uuid = string;
export type VersionNumber = long;
export type VersionString = string;
export type VersionType = 'internal' | 'external' | 'external_gte' | 'force';
export type WaitForActiveShardOptions = 'all' | 'index-setting';
export type WaitForActiveShards = integer | WaitForActiveShardOptions;
export type WaitForEvents = 'immediate' | 'urgent' | 'high' | 'normal' | 'low' | 'languid';
export interface WarmerStats {
    current: long;
    total: long;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export interface WktGeoBounds {
    wkt: string;
}
export interface WriteResponseBase {
    _id: Id;
    _index: IndexName;
    _primary_term?: long;
    result: Result;
    _seq_no?: SequenceNumber;
    _shards: ShardStatistics;
    _version: VersionNumber;
    forced_refresh?: boolean;
}
export type byte = number;
export type double = number;
export type float = number;
export type integer = number;
export type long = number;
export type short = number;
export type uint = number;
export type ulong = number;
export interface AggregationsAdjacencyMatrixAggregate extends AggregationsMultiBucketAggregateBase<AggregationsAdjacencyMatrixBucket> {
}
export interface AggregationsAdjacencyMatrixAggregation extends AggregationsBucketAggregationBase {
    filters?: Record<string, QueryDslQueryContainer>;
    separator?: string;
}
export interface AggregationsAdjacencyMatrixBucketKeys extends AggregationsMultiBucketBase {
    key: string;
}
export type AggregationsAdjacencyMatrixBucket = AggregationsAdjacencyMatrixBucketKeys & {
    [property: string]: AggregationsAggregate | string | long;
};
export type AggregationsAggregate = AggregationsCardinalityAggregate | AggregationsHdrPercentilesAggregate | AggregationsHdrPercentileRanksAggregate | AggregationsTDigestPercentilesAggregate | AggregationsTDigestPercentileRanksAggregate | AggregationsPercentilesBucketAggregate | AggregationsMedianAbsoluteDeviationAggregate | AggregationsMinAggregate | AggregationsMaxAggregate | AggregationsSumAggregate | AggregationsAvgAggregate | AggregationsWeightedAvgAggregate | AggregationsValueCountAggregate | AggregationsSimpleValueAggregate | AggregationsDerivativeAggregate | AggregationsBucketMetricValueAggregate | AggregationsStatsAggregate | AggregationsStatsBucketAggregate | AggregationsExtendedStatsAggregate | AggregationsExtendedStatsBucketAggregate | AggregationsGeoBoundsAggregate | AggregationsGeoCentroidAggregate | AggregationsHistogramAggregate | AggregationsDateHistogramAggregate | AggregationsAutoDateHistogramAggregate | AggregationsVariableWidthHistogramAggregate | AggregationsStringTermsAggregate | AggregationsLongTermsAggregate | AggregationsDoubleTermsAggregate | AggregationsUnmappedTermsAggregate | AggregationsLongRareTermsAggregate | AggregationsStringRareTermsAggregate | AggregationsUnmappedRareTermsAggregate | AggregationsMultiTermsAggregate | AggregationsMissingAggregate | AggregationsNestedAggregate | AggregationsReverseNestedAggregate | AggregationsGlobalAggregate | AggregationsFilterAggregate | AggregationsChildrenAggregate | AggregationsParentAggregate | AggregationsSamplerAggregate | AggregationsUnmappedSamplerAggregate | AggregationsGeoHashGridAggregate | AggregationsGeoTileGridAggregate | AggregationsGeoHexGridAggregate | AggregationsRangeAggregate | AggregationsDateRangeAggregate | AggregationsGeoDistanceAggregate | AggregationsIpRangeAggregate | AggregationsIpPrefixAggregate | AggregationsFiltersAggregate | AggregationsAdjacencyMatrixAggregate | AggregationsSignificantLongTermsAggregate | AggregationsSignificantStringTermsAggregate | AggregationsUnmappedSignificantTermsAggregate | AggregationsCompositeAggregate | AggregationsFrequentItemSetsAggregate | AggregationsScriptedMetricAggregate | AggregationsTopHitsAggregate | AggregationsInferenceAggregate | AggregationsStringStatsAggregate | AggregationsBoxPlotAggregate | AggregationsTopMetricsAggregate | AggregationsTTestAggregate | AggregationsRateAggregate | AggregationsCumulativeCardinalityAggregate | AggregationsMatrixStatsAggregate | AggregationsGeoLineAggregate;
export interface AggregationsAggregateBase {
    meta?: Metadata;
}
export type AggregationsAggregateOrder = Partial<Record<Field, SortOrder>> | Partial<Record<Field, SortOrder>>[];
export interface AggregationsAggregation {
}
export interface AggregationsAggregationContainer {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    aggs?: Record<string, AggregationsAggregationContainer>;
    meta?: Metadata;
    adjacency_matrix?: AggregationsAdjacencyMatrixAggregation;
    auto_date_histogram?: AggregationsAutoDateHistogramAggregation;
    avg?: AggregationsAverageAggregation;
    avg_bucket?: AggregationsAverageBucketAggregation;
    boxplot?: AggregationsBoxplotAggregation;
    bucket_script?: AggregationsBucketScriptAggregation;
    bucket_selector?: AggregationsBucketSelectorAggregation;
    bucket_sort?: AggregationsBucketSortAggregation;
    bucket_count_ks_test?: AggregationsBucketKsAggregation;
    bucket_correlation?: AggregationsBucketCorrelationAggregation;
    cardinality?: AggregationsCardinalityAggregation;
    categorize_text?: AggregationsCategorizeTextAggregation;
    children?: AggregationsChildrenAggregation;
    composite?: AggregationsCompositeAggregation;
    cumulative_cardinality?: AggregationsCumulativeCardinalityAggregation;
    cumulative_sum?: AggregationsCumulativeSumAggregation;
    date_histogram?: AggregationsDateHistogramAggregation;
    date_range?: AggregationsDateRangeAggregation;
    derivative?: AggregationsDerivativeAggregation;
    diversified_sampler?: AggregationsDiversifiedSamplerAggregation;
    extended_stats?: AggregationsExtendedStatsAggregation;
    extended_stats_bucket?: AggregationsExtendedStatsBucketAggregation;
    frequent_item_sets?: AggregationsFrequentItemSetsAggregation;
    filter?: QueryDslQueryContainer;
    filters?: AggregationsFiltersAggregation;
    geo_bounds?: AggregationsGeoBoundsAggregation;
    geo_centroid?: AggregationsGeoCentroidAggregation;
    geo_distance?: AggregationsGeoDistanceAggregation;
    geohash_grid?: AggregationsGeoHashGridAggregation;
    geo_line?: AggregationsGeoLineAggregation;
    geotile_grid?: AggregationsGeoTileGridAggregation;
    geohex_grid?: AggregationsGeohexGridAggregation;
    global?: AggregationsGlobalAggregation;
    histogram?: AggregationsHistogramAggregation;
    ip_range?: AggregationsIpRangeAggregation;
    ip_prefix?: AggregationsIpPrefixAggregation;
    inference?: AggregationsInferenceAggregation;
    line?: AggregationsGeoLineAggregation;
    matrix_stats?: AggregationsMatrixStatsAggregation;
    max?: AggregationsMaxAggregation;
    max_bucket?: AggregationsMaxBucketAggregation;
    median_absolute_deviation?: AggregationsMedianAbsoluteDeviationAggregation;
    min?: AggregationsMinAggregation;
    min_bucket?: AggregationsMinBucketAggregation;
    missing?: AggregationsMissingAggregation;
    moving_avg?: AggregationsMovingAverageAggregation;
    moving_percentiles?: AggregationsMovingPercentilesAggregation;
    moving_fn?: AggregationsMovingFunctionAggregation;
    multi_terms?: AggregationsMultiTermsAggregation;
    nested?: AggregationsNestedAggregation;
    normalize?: AggregationsNormalizeAggregation;
    parent?: AggregationsParentAggregation;
    percentile_ranks?: AggregationsPercentileRanksAggregation;
    percentiles?: AggregationsPercentilesAggregation;
    percentiles_bucket?: AggregationsPercentilesBucketAggregation;
    range?: AggregationsRangeAggregation;
    rare_terms?: AggregationsRareTermsAggregation;
    rate?: AggregationsRateAggregation;
    reverse_nested?: AggregationsReverseNestedAggregation;
    sampler?: AggregationsSamplerAggregation;
    scripted_metric?: AggregationsScriptedMetricAggregation;
    serial_diff?: AggregationsSerialDifferencingAggregation;
    significant_terms?: AggregationsSignificantTermsAggregation;
    significant_text?: AggregationsSignificantTextAggregation;
    stats?: AggregationsStatsAggregation;
    stats_bucket?: AggregationsStatsBucketAggregation;
    string_stats?: AggregationsStringStatsAggregation;
    sum?: AggregationsSumAggregation;
    sum_bucket?: AggregationsSumBucketAggregation;
    terms?: AggregationsTermsAggregation;
    top_hits?: AggregationsTopHitsAggregation;
    t_test?: AggregationsTTestAggregation;
    top_metrics?: AggregationsTopMetricsAggregation;
    value_count?: AggregationsValueCountAggregation;
    weighted_avg?: AggregationsWeightedAverageAggregation;
    variable_width_histogram?: AggregationsVariableWidthHistogramAggregation;
}
export interface AggregationsAggregationRange {
    from?: double;
    key?: string;
    to?: double;
}
export interface AggregationsArrayPercentilesItem {
    key: string;
    value: double | null;
    value_as_string?: string;
}
export interface AggregationsAutoDateHistogramAggregate extends AggregationsMultiBucketAggregateBase<AggregationsDateHistogramBucket> {
    interval: DurationLarge;
}
export interface AggregationsAutoDateHistogramAggregation extends AggregationsBucketAggregationBase {
    buckets?: integer;
    field?: Field;
    format?: string;
    minimum_interval?: AggregationsMinimumInterval;
    missing?: DateTime;
    offset?: string;
    params?: Record<string, any>;
    script?: Script | string;
    time_zone?: TimeZone;
}
export interface AggregationsAverageAggregation extends AggregationsFormatMetricAggregationBase {
}
export interface AggregationsAverageBucketAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsAvgAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsBoxPlotAggregate extends AggregationsAggregateBase {
    min: double;
    max: double;
    q1: double;
    q2: double;
    q3: double;
    lower: double;
    upper: double;
    min_as_string?: string;
    max_as_string?: string;
    q1_as_string?: string;
    q2_as_string?: string;
    q3_as_string?: string;
    lower_as_string?: string;
    upper_as_string?: string;
}
export interface AggregationsBoxplotAggregation extends AggregationsMetricAggregationBase {
    compression?: double;
}
export interface AggregationsBucketAggregationBase {
}
export interface AggregationsBucketCorrelationAggregation extends AggregationsBucketPathAggregation {
    function: AggregationsBucketCorrelationFunction;
}
export interface AggregationsBucketCorrelationFunction {
    count_correlation: AggregationsBucketCorrelationFunctionCountCorrelation;
}
export interface AggregationsBucketCorrelationFunctionCountCorrelation {
    indicator: AggregationsBucketCorrelationFunctionCountCorrelationIndicator;
}
export interface AggregationsBucketCorrelationFunctionCountCorrelationIndicator {
    doc_count: integer;
    expectations: double[];
    fractions?: double[];
}
export interface AggregationsBucketKsAggregation extends AggregationsBucketPathAggregation {
    alternative?: string[];
    fractions?: double[];
    sampling_method?: string;
}
export interface AggregationsBucketMetricValueAggregate extends AggregationsSingleMetricAggregateBase {
    keys: string[];
}
export interface AggregationsBucketPathAggregation {
    buckets_path?: AggregationsBucketsPath;
}
export interface AggregationsBucketScriptAggregation extends AggregationsPipelineAggregationBase {
    script?: Script | string;
}
export interface AggregationsBucketSelectorAggregation extends AggregationsPipelineAggregationBase {
    script?: Script | string;
}
export interface AggregationsBucketSortAggregation {
    from?: integer;
    gap_policy?: AggregationsGapPolicy;
    size?: integer;
    sort?: Sort;
}
export type AggregationsBuckets<TBucket = unknown> = Record<string, TBucket> | TBucket[];
export type AggregationsBucketsPath = string | string[] | Record<string, string>;
export type AggregationsCalendarInterval = 'second' | '1s' | 'minute' | '1m' | 'hour' | '1h' | 'day' | '1d' | 'week' | '1w' | 'month' | '1M' | 'quarter' | '1q' | 'year' | '1y';
export interface AggregationsCardinalityAggregate extends AggregationsAggregateBase {
    value: long;
}
export interface AggregationsCardinalityAggregation extends AggregationsMetricAggregationBase {
    precision_threshold?: integer;
    rehash?: boolean;
    execution_hint?: AggregationsCardinalityExecutionMode;
}
export type AggregationsCardinalityExecutionMode = 'global_ordinals' | 'segment_ordinals' | 'direct' | 'save_memory_heuristic' | 'save_time_heuristic';
export interface AggregationsCategorizeTextAggregation {
    field: Field;
    max_unique_tokens?: integer;
    max_matched_tokens?: integer;
    similarity_threshold?: integer;
    categorization_filters?: string[];
    categorization_analyzer?: AggregationsCategorizeTextAnalyzer;
    shard_size?: integer;
    size?: integer;
    min_doc_count?: integer;
    shard_min_doc_count?: integer;
}
export type AggregationsCategorizeTextAnalyzer = string | AggregationsCustomCategorizeTextAnalyzer;
export interface AggregationsChiSquareHeuristic {
    background_is_superset: boolean;
    include_negatives: boolean;
}
export interface AggregationsChildrenAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsChildrenAggregate = AggregationsChildrenAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsChildrenAggregation extends AggregationsBucketAggregationBase {
    type?: RelationName;
}
export interface AggregationsCompositeAggregate extends AggregationsMultiBucketAggregateBase<AggregationsCompositeBucket> {
    after_key?: AggregationsCompositeAggregateKey;
}
export type AggregationsCompositeAggregateKey = Record<Field, FieldValue>;
export interface AggregationsCompositeAggregation extends AggregationsBucketAggregationBase {
    after?: AggregationsCompositeAggregateKey;
    size?: integer;
    sources?: Record<string, AggregationsCompositeAggregationSource>[];
}
export interface AggregationsCompositeAggregationBase {
    field?: Field;
    missing_bucket?: boolean;
    missing_order?: AggregationsMissingOrder;
    script?: Script | string;
    value_type?: AggregationsValueType;
    order?: SortOrder;
}
export interface AggregationsCompositeAggregationSource {
    terms?: AggregationsCompositeTermsAggregation;
    histogram?: AggregationsCompositeHistogramAggregation;
    date_histogram?: AggregationsCompositeDateHistogramAggregation;
    geotile_grid?: AggregationsCompositeGeoTileGridAggregation;
}
export interface AggregationsCompositeBucketKeys extends AggregationsMultiBucketBase {
    key: AggregationsCompositeAggregateKey;
}
export type AggregationsCompositeBucket = AggregationsCompositeBucketKeys & {
    [property: string]: AggregationsAggregate | AggregationsCompositeAggregateKey | long;
};
export interface AggregationsCompositeDateHistogramAggregation extends AggregationsCompositeAggregationBase {
    format?: string;
    calendar_interval?: DurationLarge;
    fixed_interval?: DurationLarge;
    offset?: Duration;
    time_zone?: TimeZone;
}
export interface AggregationsCompositeGeoTileGridAggregation extends AggregationsCompositeAggregationBase {
    precision?: integer;
    bounds?: GeoBounds;
}
export interface AggregationsCompositeHistogramAggregation extends AggregationsCompositeAggregationBase {
    interval: double;
}
export interface AggregationsCompositeTermsAggregation extends AggregationsCompositeAggregationBase {
}
export interface AggregationsCumulativeCardinalityAggregate extends AggregationsAggregateBase {
    value: long;
    value_as_string?: string;
}
export interface AggregationsCumulativeCardinalityAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsCumulativeSumAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsCustomCategorizeTextAnalyzer {
    char_filter?: string[];
    tokenizer?: string;
    filter?: string[];
}
export interface AggregationsDateHistogramAggregate extends AggregationsMultiBucketAggregateBase<AggregationsDateHistogramBucket> {
}
export interface AggregationsDateHistogramAggregation extends AggregationsBucketAggregationBase {
    calendar_interval?: AggregationsCalendarInterval;
    extended_bounds?: AggregationsExtendedBounds<AggregationsFieldDateMath>;
    hard_bounds?: AggregationsExtendedBounds<AggregationsFieldDateMath>;
    field?: Field;
    fixed_interval?: Duration;
    format?: string;
    interval?: Duration;
    min_doc_count?: integer;
    missing?: DateTime;
    offset?: Duration;
    order?: AggregationsAggregateOrder;
    params?: Record<string, any>;
    script?: Script | string;
    time_zone?: TimeZone;
    keyed?: boolean;
}
export interface AggregationsDateHistogramBucketKeys extends AggregationsMultiBucketBase {
    key_as_string?: string;
    key: EpochTime<UnitMillis>;
}
export type AggregationsDateHistogramBucket = AggregationsDateHistogramBucketKeys & {
    [property: string]: AggregationsAggregate | string | EpochTime<UnitMillis> | long;
};
export interface AggregationsDateRangeAggregate extends AggregationsRangeAggregate {
}
export interface AggregationsDateRangeAggregation extends AggregationsBucketAggregationBase {
    field?: Field;
    format?: string;
    missing?: AggregationsMissing;
    ranges?: AggregationsDateRangeExpression[];
    time_zone?: TimeZone;
    keyed?: boolean;
}
export interface AggregationsDateRangeExpression {
    from?: AggregationsFieldDateMath;
    key?: string;
    to?: AggregationsFieldDateMath;
}
export interface AggregationsDerivativeAggregate extends AggregationsSingleMetricAggregateBase {
    normalized_value?: double;
    normalized_value_as_string?: string;
}
export interface AggregationsDerivativeAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsDiversifiedSamplerAggregation extends AggregationsBucketAggregationBase {
    execution_hint?: AggregationsSamplerAggregationExecutionHint;
    max_docs_per_value?: integer;
    script?: Script | string;
    shard_size?: integer;
    field?: Field;
}
export interface AggregationsDoubleTermsAggregate extends AggregationsTermsAggregateBase<AggregationsDoubleTermsBucket> {
}
export interface AggregationsDoubleTermsBucketKeys extends AggregationsTermsBucketBase {
    key: double;
    key_as_string?: string;
}
export type AggregationsDoubleTermsBucket = AggregationsDoubleTermsBucketKeys & {
    [property: string]: AggregationsAggregate | double | string | long;
};
export interface AggregationsEwmaModelSettings {
    alpha?: float;
}
export interface AggregationsEwmaMovingAverageAggregation extends AggregationsMovingAverageAggregationBase {
    model: 'ewma';
    settings: AggregationsEwmaModelSettings;
}
export interface AggregationsExtendedBounds<T = unknown> {
    max?: T;
    min?: T;
}
export interface AggregationsExtendedStatsAggregate extends AggregationsStatsAggregate {
    sum_of_squares: double | null;
    variance: double | null;
    variance_population: double | null;
    variance_sampling: double | null;
    std_deviation: double | null;
    std_deviation_population: double | null;
    std_deviation_sampling: double | null;
    std_deviation_bounds?: AggregationsStandardDeviationBounds;
    sum_of_squares_as_string?: string;
    variance_as_string?: string;
    variance_population_as_string?: string;
    variance_sampling_as_string?: string;
    std_deviation_as_string?: string;
    std_deviation_bounds_as_string?: AggregationsStandardDeviationBoundsAsString;
}
export interface AggregationsExtendedStatsAggregation extends AggregationsFormatMetricAggregationBase {
    sigma?: double;
}
export interface AggregationsExtendedStatsBucketAggregate extends AggregationsExtendedStatsAggregate {
}
export interface AggregationsExtendedStatsBucketAggregation extends AggregationsPipelineAggregationBase {
    sigma?: double;
}
export type AggregationsFieldDateMath = DateMath | double;
export interface AggregationsFilterAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsFilterAggregate = AggregationsFilterAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsFiltersAggregate extends AggregationsMultiBucketAggregateBase<AggregationsFiltersBucket> {
}
export interface AggregationsFiltersAggregation extends AggregationsBucketAggregationBase {
    filters?: AggregationsBuckets<QueryDslQueryContainer>;
    other_bucket?: boolean;
    other_bucket_key?: string;
    keyed?: boolean;
}
export interface AggregationsFiltersBucketKeys extends AggregationsMultiBucketBase {
}
export type AggregationsFiltersBucket = AggregationsFiltersBucketKeys & {
    [property: string]: AggregationsAggregate | long;
};
export interface AggregationsFormatMetricAggregationBase extends AggregationsMetricAggregationBase {
    format?: string;
}
export interface AggregationsFormattableMetricAggregation extends AggregationsMetricAggregationBase {
    format?: string;
}
export interface AggregationsFrequentItemSetsAggregate extends AggregationsMultiBucketAggregateBase<AggregationsFrequentItemSetsBucket> {
}
export interface AggregationsFrequentItemSetsAggregation {
    fields: AggregationsFrequentItemSetsField[];
    minimum_set_size?: integer;
    minimum_support?: double;
    size?: integer;
    filter?: QueryDslQueryContainer;
}
export interface AggregationsFrequentItemSetsBucketKeys extends AggregationsMultiBucketBase {
    key: Record<Field, string[]>;
    support: double;
}
export type AggregationsFrequentItemSetsBucket = AggregationsFrequentItemSetsBucketKeys & {
    [property: string]: AggregationsAggregate | Record<Field, string[]> | double | long;
};
export interface AggregationsFrequentItemSetsField {
    field: Field;
    exclude?: AggregationsTermsExclude;
    include?: AggregationsTermsInclude;
}
export type AggregationsGapPolicy = 'skip' | 'insert_zeros' | 'keep_values';
export interface AggregationsGeoBoundsAggregate extends AggregationsAggregateBase {
    bounds?: GeoBounds;
}
export interface AggregationsGeoBoundsAggregation extends AggregationsMetricAggregationBase {
    wrap_longitude?: boolean;
}
export interface AggregationsGeoCentroidAggregate extends AggregationsAggregateBase {
    count: long;
    location?: GeoLocation;
}
export interface AggregationsGeoCentroidAggregation extends AggregationsMetricAggregationBase {
    count?: long;
    location?: GeoLocation;
}
export interface AggregationsGeoDistanceAggregate extends AggregationsRangeAggregate {
}
export interface AggregationsGeoDistanceAggregation extends AggregationsBucketAggregationBase {
    distance_type?: GeoDistanceType;
    field?: Field;
    origin?: GeoLocation;
    ranges?: AggregationsAggregationRange[];
    unit?: DistanceUnit;
}
export interface AggregationsGeoHashGridAggregate extends AggregationsMultiBucketAggregateBase<AggregationsGeoHashGridBucket> {
}
export interface AggregationsGeoHashGridAggregation extends AggregationsBucketAggregationBase {
    bounds?: GeoBounds;
    field?: Field;
    precision?: GeoHashPrecision;
    shard_size?: integer;
    size?: integer;
}
export interface AggregationsGeoHashGridBucketKeys extends AggregationsMultiBucketBase {
    key: GeoHash;
}
export type AggregationsGeoHashGridBucket = AggregationsGeoHashGridBucketKeys & {
    [property: string]: AggregationsAggregate | GeoHash | long;
};
export interface AggregationsGeoHexGridAggregate extends AggregationsMultiBucketAggregateBase<AggregationsGeoHexGridBucket> {
}
export interface AggregationsGeoHexGridBucketKeys extends AggregationsMultiBucketBase {
    key: GeoHexCell;
}
export type AggregationsGeoHexGridBucket = AggregationsGeoHexGridBucketKeys & {
    [property: string]: AggregationsAggregate | GeoHexCell | long;
};
export interface AggregationsGeoLineAggregate extends AggregationsAggregateBase {
    type: string;
    geometry: GeoLine;
    properties: any;
}
export interface AggregationsGeoLineAggregation {
    point: AggregationsGeoLinePoint;
    sort: AggregationsGeoLineSort;
    include_sort?: boolean;
    sort_order?: SortOrder;
    size?: integer;
}
export interface AggregationsGeoLinePoint {
    field: Field;
}
export interface AggregationsGeoLineSort {
    field: Field;
}
export interface AggregationsGeoTileGridAggregate extends AggregationsMultiBucketAggregateBase<AggregationsGeoTileGridBucket> {
}
export interface AggregationsGeoTileGridAggregation extends AggregationsBucketAggregationBase {
    field?: Field;
    precision?: GeoTilePrecision;
    shard_size?: integer;
    size?: integer;
    bounds?: GeoBounds;
}
export interface AggregationsGeoTileGridBucketKeys extends AggregationsMultiBucketBase {
    key: GeoTile;
}
export type AggregationsGeoTileGridBucket = AggregationsGeoTileGridBucketKeys & {
    [property: string]: AggregationsAggregate | GeoTile | long;
};
export interface AggregationsGeohexGridAggregation extends AggregationsBucketAggregationBase {
    field: Field;
    precision?: integer;
    bounds?: GeoBounds;
    size?: integer;
    shard_size?: integer;
}
export interface AggregationsGlobalAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsGlobalAggregate = AggregationsGlobalAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsGlobalAggregation extends AggregationsBucketAggregationBase {
}
export interface AggregationsGoogleNormalizedDistanceHeuristic {
    background_is_superset?: boolean;
}
export interface AggregationsHdrMethod {
    number_of_significant_value_digits?: integer;
}
export interface AggregationsHdrPercentileRanksAggregate extends AggregationsPercentilesAggregateBase {
}
export interface AggregationsHdrPercentilesAggregate extends AggregationsPercentilesAggregateBase {
}
export interface AggregationsHistogramAggregate extends AggregationsMultiBucketAggregateBase<AggregationsHistogramBucket> {
}
export interface AggregationsHistogramAggregation extends AggregationsBucketAggregationBase {
    extended_bounds?: AggregationsExtendedBounds<double>;
    hard_bounds?: AggregationsExtendedBounds<double>;
    field?: Field;
    interval?: double;
    min_doc_count?: integer;
    missing?: double;
    offset?: double;
    order?: AggregationsAggregateOrder;
    script?: Script | string;
    format?: string;
    keyed?: boolean;
}
export interface AggregationsHistogramBucketKeys extends AggregationsMultiBucketBase {
    key_as_string?: string;
    key: double;
}
export type AggregationsHistogramBucket = AggregationsHistogramBucketKeys & {
    [property: string]: AggregationsAggregate | string | double | long;
};
export interface AggregationsHoltLinearModelSettings {
    alpha?: float;
    beta?: float;
}
export interface AggregationsHoltMovingAverageAggregation extends AggregationsMovingAverageAggregationBase {
    model: 'holt';
    settings: AggregationsHoltLinearModelSettings;
}
export interface AggregationsHoltWintersModelSettings {
    alpha?: float;
    beta?: float;
    gamma?: float;
    pad?: boolean;
    period?: integer;
    type?: AggregationsHoltWintersType;
}
export interface AggregationsHoltWintersMovingAverageAggregation extends AggregationsMovingAverageAggregationBase {
    model: 'holt_winters';
    settings: AggregationsHoltWintersModelSettings;
}
export type AggregationsHoltWintersType = 'add' | 'mult';
export interface AggregationsInferenceAggregateKeys extends AggregationsAggregateBase {
    value?: FieldValue;
    feature_importance?: AggregationsInferenceFeatureImportance[];
    top_classes?: AggregationsInferenceTopClassEntry[];
    warning?: string;
}
export type AggregationsInferenceAggregate = AggregationsInferenceAggregateKeys & {
    [property: string]: any;
};
export interface AggregationsInferenceAggregation extends AggregationsPipelineAggregationBase {
    model_id: Name;
    inference_config?: AggregationsInferenceConfigContainer;
}
export interface AggregationsInferenceClassImportance {
    class_name: string;
    importance: double;
}
export interface AggregationsInferenceConfigContainer {
    regression?: MlRegressionInferenceOptions;
    classification?: MlClassificationInferenceOptions;
}
export interface AggregationsInferenceFeatureImportance {
    feature_name: string;
    importance?: double;
    classes?: AggregationsInferenceClassImportance[];
}
export interface AggregationsInferenceTopClassEntry {
    class_name: FieldValue;
    class_probability: double;
    class_score: double;
}
export interface AggregationsIpPrefixAggregate extends AggregationsMultiBucketAggregateBase<AggregationsIpPrefixBucket> {
}
export interface AggregationsIpPrefixAggregation extends AggregationsBucketAggregationBase {
    field: Field;
    prefix_length: integer;
    is_ipv6?: boolean;
    append_prefix_length?: boolean;
    keyed?: boolean;
    min_doc_count?: long;
}
export interface AggregationsIpPrefixBucketKeys extends AggregationsMultiBucketBase {
    is_ipv6: boolean;
    key: string;
    prefix_length: integer;
    netmask?: string;
}
export type AggregationsIpPrefixBucket = AggregationsIpPrefixBucketKeys & {
    [property: string]: AggregationsAggregate | boolean | string | integer | long;
};
export interface AggregationsIpRangeAggregate extends AggregationsMultiBucketAggregateBase<AggregationsIpRangeBucket> {
}
export interface AggregationsIpRangeAggregation extends AggregationsBucketAggregationBase {
    field?: Field;
    ranges?: AggregationsIpRangeAggregationRange[];
}
export interface AggregationsIpRangeAggregationRange {
    from?: string | null;
    mask?: string;
    to?: string | null;
}
export interface AggregationsIpRangeBucketKeys extends AggregationsMultiBucketBase {
    key?: string;
    from?: string;
    to?: string;
}
export type AggregationsIpRangeBucket = AggregationsIpRangeBucketKeys & {
    [property: string]: AggregationsAggregate | string | long;
};
export type AggregationsKeyedPercentiles = Record<string, string | long | null>;
export interface AggregationsLinearMovingAverageAggregation extends AggregationsMovingAverageAggregationBase {
    model: 'linear';
    settings: EmptyObject;
}
export interface AggregationsLongRareTermsAggregate extends AggregationsMultiBucketAggregateBase<AggregationsLongRareTermsBucket> {
}
export interface AggregationsLongRareTermsBucketKeys extends AggregationsMultiBucketBase {
    key: long;
    key_as_string?: string;
}
export type AggregationsLongRareTermsBucket = AggregationsLongRareTermsBucketKeys & {
    [property: string]: AggregationsAggregate | long | string;
};
export interface AggregationsLongTermsAggregate extends AggregationsTermsAggregateBase<AggregationsLongTermsBucket> {
}
export interface AggregationsLongTermsBucketKeys extends AggregationsTermsBucketBase {
    key: long;
    key_as_string?: string;
}
export type AggregationsLongTermsBucket = AggregationsLongTermsBucketKeys & {
    [property: string]: AggregationsAggregate | long | string;
};
export interface AggregationsMatrixAggregation {
    fields?: Fields;
    missing?: Record<Field, double>;
}
export interface AggregationsMatrixStatsAggregate extends AggregationsAggregateBase {
    doc_count: long;
    fields?: AggregationsMatrixStatsFields[];
}
export interface AggregationsMatrixStatsAggregation extends AggregationsMatrixAggregation {
    mode?: SortMode;
}
export interface AggregationsMatrixStatsFields {
    name: Field;
    count: long;
    mean: double;
    variance: double;
    skewness: double;
    kurtosis: double;
    covariance: Record<Field, double>;
    correlation: Record<Field, double>;
}
export interface AggregationsMaxAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsMaxAggregation extends AggregationsFormatMetricAggregationBase {
}
export interface AggregationsMaxBucketAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsMedianAbsoluteDeviationAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsMedianAbsoluteDeviationAggregation extends AggregationsFormatMetricAggregationBase {
    compression?: double;
}
export interface AggregationsMetricAggregationBase {
    field?: Field;
    missing?: AggregationsMissing;
    script?: Script | string;
}
export interface AggregationsMinAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsMinAggregation extends AggregationsFormatMetricAggregationBase {
}
export interface AggregationsMinBucketAggregation extends AggregationsPipelineAggregationBase {
}
export type AggregationsMinimumInterval = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';
export type AggregationsMissing = string | integer | double | boolean;
export interface AggregationsMissingAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsMissingAggregate = AggregationsMissingAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsMissingAggregation extends AggregationsBucketAggregationBase {
    field?: Field;
    missing?: AggregationsMissing;
}
export type AggregationsMissingOrder = 'first' | 'last' | 'default';
export type AggregationsMovingAverageAggregation = AggregationsLinearMovingAverageAggregation | AggregationsSimpleMovingAverageAggregation | AggregationsEwmaMovingAverageAggregation | AggregationsHoltMovingAverageAggregation | AggregationsHoltWintersMovingAverageAggregation;
export interface AggregationsMovingAverageAggregationBase extends AggregationsPipelineAggregationBase {
    minimize?: boolean;
    predict?: integer;
    window?: integer;
}
export interface AggregationsMovingFunctionAggregation extends AggregationsPipelineAggregationBase {
    script?: string;
    shift?: integer;
    window?: integer;
}
export interface AggregationsMovingPercentilesAggregation extends AggregationsPipelineAggregationBase {
    window?: integer;
    shift?: integer;
    keyed?: boolean;
}
export interface AggregationsMultiBucketAggregateBase<TBucket = unknown> extends AggregationsAggregateBase {
    buckets: AggregationsBuckets<TBucket>;
}
export interface AggregationsMultiBucketBase {
    doc_count: long;
}
export interface AggregationsMultiTermLookup {
    field: Field;
    missing?: AggregationsMissing;
}
export interface AggregationsMultiTermsAggregate extends AggregationsTermsAggregateBase<AggregationsMultiTermsBucket> {
}
export interface AggregationsMultiTermsAggregation extends AggregationsBucketAggregationBase {
    collect_mode?: AggregationsTermsAggregationCollectMode;
    order?: AggregationsAggregateOrder;
    min_doc_count?: long;
    shard_min_doc_count?: long;
    shard_size?: integer;
    show_term_doc_count_error?: boolean;
    size?: integer;
    terms: AggregationsMultiTermLookup[];
}
export interface AggregationsMultiTermsBucketKeys extends AggregationsMultiBucketBase {
    key: FieldValue[];
    key_as_string?: string;
    doc_count_error_upper_bound?: long;
}
export type AggregationsMultiTermsBucket = AggregationsMultiTermsBucketKeys & {
    [property: string]: AggregationsAggregate | FieldValue[] | string | long;
};
export interface AggregationsMutualInformationHeuristic {
    background_is_superset?: boolean;
    include_negatives?: boolean;
}
export interface AggregationsNestedAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsNestedAggregate = AggregationsNestedAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsNestedAggregation extends AggregationsBucketAggregationBase {
    path?: Field;
}
export interface AggregationsNormalizeAggregation extends AggregationsPipelineAggregationBase {
    method?: AggregationsNormalizeMethod;
}
export type AggregationsNormalizeMethod = 'rescale_0_1' | 'rescale_0_100' | 'percent_of_sum' | 'mean' | 'z-score' | 'softmax';
export interface AggregationsParentAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsParentAggregate = AggregationsParentAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsParentAggregation extends AggregationsBucketAggregationBase {
    type?: RelationName;
}
export interface AggregationsPercentageScoreHeuristic {
}
export interface AggregationsPercentileRanksAggregation extends AggregationsFormatMetricAggregationBase {
    keyed?: boolean;
    values?: double[] | null;
    hdr?: AggregationsHdrMethod;
    tdigest?: AggregationsTDigest;
}
export type AggregationsPercentiles = AggregationsKeyedPercentiles | AggregationsArrayPercentilesItem[];
export interface AggregationsPercentilesAggregateBase extends AggregationsAggregateBase {
    values: AggregationsPercentiles;
}
export interface AggregationsPercentilesAggregation extends AggregationsFormatMetricAggregationBase {
    keyed?: boolean;
    percents?: double[];
    hdr?: AggregationsHdrMethod;
    tdigest?: AggregationsTDigest;
}
export interface AggregationsPercentilesBucketAggregate extends AggregationsPercentilesAggregateBase {
}
export interface AggregationsPercentilesBucketAggregation extends AggregationsPipelineAggregationBase {
    percents?: double[];
}
export interface AggregationsPipelineAggregationBase extends AggregationsBucketPathAggregation {
    format?: string;
    gap_policy?: AggregationsGapPolicy;
}
export interface AggregationsRangeAggregate extends AggregationsMultiBucketAggregateBase<AggregationsRangeBucket> {
}
export interface AggregationsRangeAggregation extends AggregationsBucketAggregationBase {
    field?: Field;
    missing?: integer;
    ranges?: AggregationsAggregationRange[];
    script?: Script | string;
    keyed?: boolean;
    format?: string;
}
export interface AggregationsRangeBucketKeys extends AggregationsMultiBucketBase {
    from?: double;
    to?: double;
    from_as_string?: string;
    to_as_string?: string;
    key?: string;
}
export type AggregationsRangeBucket = AggregationsRangeBucketKeys & {
    [property: string]: AggregationsAggregate | double | string | long;
};
export interface AggregationsRareTermsAggregation extends AggregationsBucketAggregationBase {
    exclude?: AggregationsTermsExclude;
    field?: Field;
    include?: AggregationsTermsInclude;
    max_doc_count?: long;
    missing?: AggregationsMissing;
    precision?: double;
    value_type?: string;
}
export interface AggregationsRateAggregate extends AggregationsAggregateBase {
    value: double;
    value_as_string?: string;
}
export interface AggregationsRateAggregation extends AggregationsFormatMetricAggregationBase {
    unit?: AggregationsCalendarInterval;
    mode?: AggregationsRateMode;
}
export type AggregationsRateMode = 'sum' | 'value_count';
export interface AggregationsReverseNestedAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsReverseNestedAggregate = AggregationsReverseNestedAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsReverseNestedAggregation extends AggregationsBucketAggregationBase {
    path?: Field;
}
export interface AggregationsSamplerAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsSamplerAggregate = AggregationsSamplerAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsSamplerAggregation extends AggregationsBucketAggregationBase {
    shard_size?: integer;
}
export type AggregationsSamplerAggregationExecutionHint = 'map' | 'global_ordinals' | 'bytes_hash';
export interface AggregationsScriptedHeuristic {
    script: Script | string;
}
export interface AggregationsScriptedMetricAggregate extends AggregationsAggregateBase {
    value: any;
}
export interface AggregationsScriptedMetricAggregation extends AggregationsMetricAggregationBase {
    combine_script?: Script | string;
    init_script?: Script | string;
    map_script?: Script | string;
    params?: Record<string, any>;
    reduce_script?: Script | string;
}
export interface AggregationsSerialDifferencingAggregation extends AggregationsPipelineAggregationBase {
    lag?: integer;
}
export interface AggregationsSignificantLongTermsAggregate extends AggregationsSignificantTermsAggregateBase<AggregationsSignificantLongTermsBucket> {
}
export interface AggregationsSignificantLongTermsBucketKeys extends AggregationsSignificantTermsBucketBase {
    key: long;
    key_as_string?: string;
}
export type AggregationsSignificantLongTermsBucket = AggregationsSignificantLongTermsBucketKeys & {
    [property: string]: AggregationsAggregate | long | string | double;
};
export interface AggregationsSignificantStringTermsAggregate extends AggregationsSignificantTermsAggregateBase<AggregationsSignificantStringTermsBucket> {
}
export interface AggregationsSignificantStringTermsBucketKeys extends AggregationsSignificantTermsBucketBase {
    key: string;
}
export type AggregationsSignificantStringTermsBucket = AggregationsSignificantStringTermsBucketKeys & {
    [property: string]: AggregationsAggregate | string | double | long;
};
export interface AggregationsSignificantTermsAggregateBase<T = unknown> extends AggregationsMultiBucketAggregateBase<T> {
    bg_count?: long;
    doc_count?: long;
}
export interface AggregationsSignificantTermsAggregation extends AggregationsBucketAggregationBase {
    background_filter?: QueryDslQueryContainer;
    chi_square?: AggregationsChiSquareHeuristic;
    exclude?: AggregationsTermsExclude;
    execution_hint?: AggregationsTermsAggregationExecutionHint;
    field?: Field;
    gnd?: AggregationsGoogleNormalizedDistanceHeuristic;
    include?: AggregationsTermsInclude;
    jlh?: EmptyObject;
    min_doc_count?: long;
    mutual_information?: AggregationsMutualInformationHeuristic;
    percentage?: AggregationsPercentageScoreHeuristic;
    script_heuristic?: AggregationsScriptedHeuristic;
    shard_min_doc_count?: long;
    shard_size?: integer;
    size?: integer;
}
export interface AggregationsSignificantTermsBucketBase extends AggregationsMultiBucketBase {
    score: double;
    bg_count: long;
}
export interface AggregationsSignificantTextAggregation extends AggregationsBucketAggregationBase {
    background_filter?: QueryDslQueryContainer;
    chi_square?: AggregationsChiSquareHeuristic;
    exclude?: AggregationsTermsExclude;
    execution_hint?: AggregationsTermsAggregationExecutionHint;
    field?: Field;
    filter_duplicate_text?: boolean;
    gnd?: AggregationsGoogleNormalizedDistanceHeuristic;
    include?: AggregationsTermsInclude;
    jlh?: EmptyObject;
    min_doc_count?: long;
    mutual_information?: AggregationsMutualInformationHeuristic;
    percentage?: AggregationsPercentageScoreHeuristic;
    script_heuristic?: AggregationsScriptedHeuristic;
    shard_min_doc_count?: long;
    shard_size?: integer;
    size?: integer;
    source_fields?: Fields;
}
export interface AggregationsSimpleMovingAverageAggregation extends AggregationsMovingAverageAggregationBase {
    model: 'simple';
    settings: EmptyObject;
}
export interface AggregationsSimpleValueAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsSingleBucketAggregateBase extends AggregationsAggregateBase {
    doc_count: long;
}
export interface AggregationsSingleMetricAggregateBase extends AggregationsAggregateBase {
    value: double | null;
    value_as_string?: string;
}
export interface AggregationsStandardDeviationBounds {
    upper: double | null;
    lower: double | null;
    upper_population: double | null;
    lower_population: double | null;
    upper_sampling: double | null;
    lower_sampling: double | null;
}
export interface AggregationsStandardDeviationBoundsAsString {
    upper: string;
    lower: string;
    upper_population: string;
    lower_population: string;
    upper_sampling: string;
    lower_sampling: string;
}
export interface AggregationsStatsAggregate extends AggregationsAggregateBase {
    count: long;
    min: double | null;
    max: double | null;
    avg: double | null;
    sum: double;
    min_as_string?: string;
    max_as_string?: string;
    avg_as_string?: string;
    sum_as_string?: string;
}
export interface AggregationsStatsAggregation extends AggregationsFormatMetricAggregationBase {
}
export interface AggregationsStatsBucketAggregate extends AggregationsStatsAggregate {
}
export interface AggregationsStatsBucketAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsStringRareTermsAggregate extends AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucket> {
}
export interface AggregationsStringRareTermsBucketKeys extends AggregationsMultiBucketBase {
    key: string;
}
export type AggregationsStringRareTermsBucket = AggregationsStringRareTermsBucketKeys & {
    [property: string]: AggregationsAggregate | string | long;
};
export interface AggregationsStringStatsAggregate extends AggregationsAggregateBase {
    count: long;
    min_length: integer | null;
    max_length: integer | null;
    avg_length: double | null;
    entropy: double | null;
    distribution?: Record<string, double> | null;
    min_length_as_string?: string;
    max_length_as_string?: string;
    avg_length_as_string?: string;
}
export interface AggregationsStringStatsAggregation extends AggregationsMetricAggregationBase {
    show_distribution?: boolean;
}
export interface AggregationsStringTermsAggregate extends AggregationsTermsAggregateBase<AggregationsStringTermsBucket> {
}
export interface AggregationsStringTermsBucketKeys extends AggregationsTermsBucketBase {
    key: FieldValue;
}
export type AggregationsStringTermsBucket = AggregationsStringTermsBucketKeys & {
    [property: string]: AggregationsAggregate | FieldValue | long;
};
export interface AggregationsSumAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsSumAggregation extends AggregationsFormatMetricAggregationBase {
}
export interface AggregationsSumBucketAggregation extends AggregationsPipelineAggregationBase {
}
export interface AggregationsTDigest {
    compression?: integer;
}
export interface AggregationsTDigestPercentileRanksAggregate extends AggregationsPercentilesAggregateBase {
}
export interface AggregationsTDigestPercentilesAggregate extends AggregationsPercentilesAggregateBase {
}
export interface AggregationsTTestAggregate extends AggregationsAggregateBase {
    value: double | null;
    value_as_string?: string;
}
export interface AggregationsTTestAggregation {
    a?: AggregationsTestPopulation;
    b?: AggregationsTestPopulation;
    type?: AggregationsTTestType;
}
export type AggregationsTTestType = 'paired' | 'homoscedastic' | 'heteroscedastic';
export interface AggregationsTermsAggregateBase<TBucket = unknown> extends AggregationsMultiBucketAggregateBase<TBucket> {
    doc_count_error_upper_bound?: long;
    sum_other_doc_count?: long;
}
export interface AggregationsTermsAggregation extends AggregationsBucketAggregationBase {
    collect_mode?: AggregationsTermsAggregationCollectMode;
    exclude?: AggregationsTermsExclude;
    execution_hint?: AggregationsTermsAggregationExecutionHint;
    field?: Field;
    include?: AggregationsTermsInclude;
    min_doc_count?: integer;
    missing?: AggregationsMissing;
    missing_order?: AggregationsMissingOrder;
    missing_bucket?: boolean;
    value_type?: string;
    order?: AggregationsAggregateOrder;
    script?: Script | string;
    shard_min_doc_count?: long;
    shard_size?: integer;
    show_term_doc_count_error?: boolean;
    size?: integer;
    format?: string;
}
export type AggregationsTermsAggregationCollectMode = 'depth_first' | 'breadth_first';
export type AggregationsTermsAggregationExecutionHint = 'map' | 'global_ordinals' | 'global_ordinals_hash' | 'global_ordinals_low_cardinality';
export interface AggregationsTermsBucketBase extends AggregationsMultiBucketBase {
    doc_count_error_upper_bound?: long;
}
export type AggregationsTermsExclude = string | string[];
export type AggregationsTermsInclude = string | string[] | AggregationsTermsPartition;
export interface AggregationsTermsPartition {
    num_partitions: long;
    partition: long;
}
export interface AggregationsTestPopulation {
    field: Field;
    script?: Script | string;
    filter?: QueryDslQueryContainer;
}
export interface AggregationsTopHitsAggregate extends AggregationsAggregateBase {
    hits: SearchHitsMetadata<any>;
}
export interface AggregationsTopHitsAggregation extends AggregationsMetricAggregationBase {
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    explain?: boolean;
    fields?: (QueryDslFieldAndFormat | Field)[];
    from?: integer;
    highlight?: SearchHighlight;
    script_fields?: Record<string, ScriptField>;
    size?: integer;
    sort?: Sort;
    _source?: SearchSourceConfig;
    stored_fields?: Fields;
    track_scores?: boolean;
    version?: boolean;
    seq_no_primary_term?: boolean;
}
export interface AggregationsTopMetrics {
    sort: (FieldValue | null)[];
    metrics: Record<string, FieldValue | null>;
}
export interface AggregationsTopMetricsAggregate extends AggregationsAggregateBase {
    top: AggregationsTopMetrics[];
}
export interface AggregationsTopMetricsAggregation extends AggregationsMetricAggregationBase {
    metrics?: AggregationsTopMetricsValue | AggregationsTopMetricsValue[];
    size?: integer;
    sort?: Sort;
}
export interface AggregationsTopMetricsValue {
    field: Field;
}
export interface AggregationsUnmappedRareTermsAggregate extends AggregationsMultiBucketAggregateBase<void> {
}
export interface AggregationsUnmappedSamplerAggregateKeys extends AggregationsSingleBucketAggregateBase {
}
export type AggregationsUnmappedSamplerAggregate = AggregationsUnmappedSamplerAggregateKeys & {
    [property: string]: AggregationsAggregate | long | Metadata;
};
export interface AggregationsUnmappedSignificantTermsAggregate extends AggregationsSignificantTermsAggregateBase<void> {
}
export interface AggregationsUnmappedTermsAggregate extends AggregationsTermsAggregateBase<void> {
}
export interface AggregationsValueCountAggregate extends AggregationsSingleMetricAggregateBase {
}
export interface AggregationsValueCountAggregation extends AggregationsFormattableMetricAggregation {
}
export type AggregationsValueType = 'string' | 'long' | 'double' | 'number' | 'date' | 'date_nanos' | 'ip' | 'numeric' | 'geo_point' | 'boolean';
export interface AggregationsVariableWidthHistogramAggregate extends AggregationsMultiBucketAggregateBase<AggregationsVariableWidthHistogramBucket> {
}
export interface AggregationsVariableWidthHistogramAggregation {
    field?: Field;
    buckets?: integer;
    shard_size?: integer;
    initial_buffer?: integer;
    script?: Script | string;
}
export interface AggregationsVariableWidthHistogramBucketKeys extends AggregationsMultiBucketBase {
    min: double;
    key: double;
    max: double;
    min_as_string?: string;
    key_as_string?: string;
    max_as_string?: string;
}
export type AggregationsVariableWidthHistogramBucket = AggregationsVariableWidthHistogramBucketKeys & {
    [property: string]: AggregationsAggregate | double | string | long;
};
export interface AggregationsWeightedAverageAggregation {
    format?: string;
    value?: AggregationsWeightedAverageValue;
    value_type?: AggregationsValueType;
    weight?: AggregationsWeightedAverageValue;
}
export interface AggregationsWeightedAverageValue {
    field?: Field;
    missing?: double;
    script?: Script | string;
}
export interface AggregationsWeightedAvgAggregate extends AggregationsSingleMetricAggregateBase {
}
export type AnalysisAnalyzer = AnalysisCustomAnalyzer | AnalysisFingerprintAnalyzer | AnalysisKeywordAnalyzer | AnalysisLanguageAnalyzer | AnalysisNoriAnalyzer | AnalysisPatternAnalyzer | AnalysisSimpleAnalyzer | AnalysisStandardAnalyzer | AnalysisStopAnalyzer | AnalysisWhitespaceAnalyzer | AnalysisIcuAnalyzer | AnalysisKuromojiAnalyzer | AnalysisSnowballAnalyzer | AnalysisDutchAnalyzer;
export interface AnalysisAsciiFoldingTokenFilter extends AnalysisTokenFilterBase {
    type: 'asciifolding';
    preserve_original?: SpecUtilsStringified<boolean>;
}
export type AnalysisCharFilter = string | AnalysisCharFilterDefinition;
export interface AnalysisCharFilterBase {
    version?: VersionString;
}
export type AnalysisCharFilterDefinition = AnalysisHtmlStripCharFilter | AnalysisMappingCharFilter | AnalysisPatternReplaceCharFilter | AnalysisIcuNormalizationCharFilter | AnalysisKuromojiIterationMarkCharFilter;
export interface AnalysisCharGroupTokenizer extends AnalysisTokenizerBase {
    type: 'char_group';
    tokenize_on_chars: string[];
    max_token_length?: integer;
}
export interface AnalysisCommonGramsTokenFilter extends AnalysisTokenFilterBase {
    type: 'common_grams';
    common_words?: string[];
    common_words_path?: string;
    ignore_case?: boolean;
    query_mode?: boolean;
}
export interface AnalysisCompoundWordTokenFilterBase extends AnalysisTokenFilterBase {
    hyphenation_patterns_path?: string;
    max_subword_size?: integer;
    min_subword_size?: integer;
    min_word_size?: integer;
    only_longest_match?: boolean;
    word_list?: string[];
    word_list_path?: string;
}
export interface AnalysisConditionTokenFilter extends AnalysisTokenFilterBase {
    type: 'condition';
    filter: string[];
    script: Script | string;
}
export interface AnalysisCustomAnalyzer {
    type: 'custom';
    char_filter?: string[];
    filter?: string[];
    position_increment_gap?: integer;
    position_offset_gap?: integer;
    tokenizer: string;
}
export interface AnalysisCustomNormalizer {
    type: 'custom';
    char_filter?: string[];
    filter?: string[];
}
export type AnalysisDelimitedPayloadEncoding = 'int' | 'float' | 'identity';
export interface AnalysisDelimitedPayloadTokenFilter extends AnalysisTokenFilterBase {
    type: 'delimited_payload';
    delimiter?: string;
    encoding?: AnalysisDelimitedPayloadEncoding;
}
export interface AnalysisDictionaryDecompounderTokenFilter extends AnalysisCompoundWordTokenFilterBase {
    type: 'dictionary_decompounder';
}
export interface AnalysisDutchAnalyzer {
    type: 'dutch';
    stopwords?: AnalysisStopWords;
}
export type AnalysisEdgeNGramSide = 'front' | 'back';
export interface AnalysisEdgeNGramTokenFilter extends AnalysisTokenFilterBase {
    type: 'edge_ngram';
    max_gram?: integer;
    min_gram?: integer;
    side?: AnalysisEdgeNGramSide;
    preserve_original?: SpecUtilsStringified<boolean>;
}
export interface AnalysisEdgeNGramTokenizer extends AnalysisTokenizerBase {
    type: 'edge_ngram';
    custom_token_chars?: string;
    max_gram: integer;
    min_gram: integer;
    token_chars: AnalysisTokenChar[];
}
export interface AnalysisElisionTokenFilter extends AnalysisTokenFilterBase {
    type: 'elision';
    articles?: string[];
    articles_path?: string;
    articles_case?: SpecUtilsStringified<boolean>;
}
export interface AnalysisFingerprintAnalyzer {
    type: 'fingerprint';
    version?: VersionString;
    max_output_size: integer;
    preserve_original: boolean;
    separator: string;
    stopwords?: AnalysisStopWords;
    stopwords_path?: string;
}
export interface AnalysisFingerprintTokenFilter extends AnalysisTokenFilterBase {
    type: 'fingerprint';
    max_output_size?: integer;
    separator?: string;
}
export interface AnalysisHtmlStripCharFilter extends AnalysisCharFilterBase {
    type: 'html_strip';
    escaped_tags?: string[];
}
export interface AnalysisHunspellTokenFilter extends AnalysisTokenFilterBase {
    type: 'hunspell';
    dedup?: boolean;
    dictionary?: string;
    locale: string;
    longest_only?: boolean;
}
export interface AnalysisHyphenationDecompounderTokenFilter extends AnalysisCompoundWordTokenFilterBase {
    type: 'hyphenation_decompounder';
}
export interface AnalysisIcuAnalyzer {
    type: 'icu_analyzer';
    method: AnalysisIcuNormalizationType;
    mode: AnalysisIcuNormalizationMode;
}
export type AnalysisIcuCollationAlternate = 'shifted' | 'non-ignorable';
export type AnalysisIcuCollationCaseFirst = 'lower' | 'upper';
export type AnalysisIcuCollationDecomposition = 'no' | 'identical';
export type AnalysisIcuCollationStrength = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'identical';
export interface AnalysisIcuCollationTokenFilter extends AnalysisTokenFilterBase {
    type: 'icu_collation';
    alternate?: AnalysisIcuCollationAlternate;
    case_first?: AnalysisIcuCollationCaseFirst;
    case_level?: boolean;
    country?: string;
    decomposition?: AnalysisIcuCollationDecomposition;
    hiragana_quaternary_mode?: boolean;
    language?: string;
    numeric?: boolean;
    rules?: string;
    strength?: AnalysisIcuCollationStrength;
    variable_top?: string;
    variant?: string;
}
export interface AnalysisIcuFoldingTokenFilter extends AnalysisTokenFilterBase {
    type: 'icu_folding';
    unicode_set_filter: string;
}
export interface AnalysisIcuNormalizationCharFilter extends AnalysisCharFilterBase {
    type: 'icu_normalizer';
    mode?: AnalysisIcuNormalizationMode;
    name?: AnalysisIcuNormalizationType;
}
export type AnalysisIcuNormalizationMode = 'decompose' | 'compose';
export interface AnalysisIcuNormalizationTokenFilter extends AnalysisTokenFilterBase {
    type: 'icu_normalizer';
    name: AnalysisIcuNormalizationType;
}
export type AnalysisIcuNormalizationType = 'nfc' | 'nfkc' | 'nfkc_cf';
export interface AnalysisIcuTokenizer extends AnalysisTokenizerBase {
    type: 'icu_tokenizer';
    rule_files: string;
}
export type AnalysisIcuTransformDirection = 'forward' | 'reverse';
export interface AnalysisIcuTransformTokenFilter extends AnalysisTokenFilterBase {
    type: 'icu_transform';
    dir?: AnalysisIcuTransformDirection;
    id: string;
}
export interface AnalysisKStemTokenFilter extends AnalysisTokenFilterBase {
    type: 'kstem';
}
export type AnalysisKeepTypesMode = 'include' | 'exclude';
export interface AnalysisKeepTypesTokenFilter extends AnalysisTokenFilterBase {
    type: 'keep_types';
    mode?: AnalysisKeepTypesMode;
    types?: string[];
}
export interface AnalysisKeepWordsTokenFilter extends AnalysisTokenFilterBase {
    type: 'keep';
    keep_words?: string[];
    keep_words_case?: boolean;
    keep_words_path?: string;
}
export interface AnalysisKeywordAnalyzer {
    type: 'keyword';
    version?: VersionString;
}
export interface AnalysisKeywordMarkerTokenFilter extends AnalysisTokenFilterBase {
    type: 'keyword_marker';
    ignore_case?: boolean;
    keywords?: string[];
    keywords_path?: string;
    keywords_pattern?: string;
}
export interface AnalysisKeywordTokenizer extends AnalysisTokenizerBase {
    type: 'keyword';
    buffer_size: integer;
}
export interface AnalysisKuromojiAnalyzer {
    type: 'kuromoji';
    mode: AnalysisKuromojiTokenizationMode;
    user_dictionary?: string;
}
export interface AnalysisKuromojiIterationMarkCharFilter extends AnalysisCharFilterBase {
    type: 'kuromoji_iteration_mark';
    normalize_kana: boolean;
    normalize_kanji: boolean;
}
export interface AnalysisKuromojiPartOfSpeechTokenFilter extends AnalysisTokenFilterBase {
    type: 'kuromoji_part_of_speech';
    stoptags: string[];
}
export interface AnalysisKuromojiReadingFormTokenFilter extends AnalysisTokenFilterBase {
    type: 'kuromoji_readingform';
    use_romaji: boolean;
}
export interface AnalysisKuromojiStemmerTokenFilter extends AnalysisTokenFilterBase {
    type: 'kuromoji_stemmer';
    minimum_length: integer;
}
export type AnalysisKuromojiTokenizationMode = 'normal' | 'search' | 'extended';
export interface AnalysisKuromojiTokenizer extends AnalysisTokenizerBase {
    type: 'kuromoji_tokenizer';
    discard_punctuation?: boolean;
    mode: AnalysisKuromojiTokenizationMode;
    nbest_cost?: integer;
    nbest_examples?: string;
    user_dictionary?: string;
    user_dictionary_rules?: string[];
    discard_compound_token?: boolean;
}
export type AnalysisLanguage = 'Arabic' | 'Armenian' | 'Basque' | 'Brazilian' | 'Bulgarian' | 'Catalan' | 'Chinese' | 'Cjk' | 'Czech' | 'Danish' | 'Dutch' | 'English' | 'Estonian' | 'Finnish' | 'French' | 'Galician' | 'German' | 'Greek' | 'Hindi' | 'Hungarian' | 'Indonesian' | 'Irish' | 'Italian' | 'Latvian' | 'Norwegian' | 'Persian' | 'Portuguese' | 'Romanian' | 'Russian' | 'Sorani' | 'Spanish' | 'Swedish' | 'Turkish' | 'Thai';
export interface AnalysisLanguageAnalyzer {
    type: 'language';
    version?: VersionString;
    language: AnalysisLanguage;
    stem_exclusion: string[];
    stopwords?: AnalysisStopWords;
    stopwords_path?: string;
}
export interface AnalysisLengthTokenFilter extends AnalysisTokenFilterBase {
    type: 'length';
    max?: integer;
    min?: integer;
}
export interface AnalysisLetterTokenizer extends AnalysisTokenizerBase {
    type: 'letter';
}
export interface AnalysisLimitTokenCountTokenFilter extends AnalysisTokenFilterBase {
    type: 'limit';
    consume_all_tokens?: boolean;
    max_token_count?: SpecUtilsStringified<integer>;
}
export interface AnalysisLowercaseNormalizer {
    type: 'lowercase';
}
export interface AnalysisLowercaseTokenFilter extends AnalysisTokenFilterBase {
    type: 'lowercase';
    language?: string;
}
export interface AnalysisLowercaseTokenizer extends AnalysisTokenizerBase {
    type: 'lowercase';
}
export interface AnalysisMappingCharFilter extends AnalysisCharFilterBase {
    type: 'mapping';
    mappings?: string[];
    mappings_path?: string;
}
export interface AnalysisMultiplexerTokenFilter extends AnalysisTokenFilterBase {
    type: 'multiplexer';
    filters: string[];
    preserve_original?: SpecUtilsStringified<boolean>;
}
export interface AnalysisNGramTokenFilter extends AnalysisTokenFilterBase {
    type: 'ngram';
    max_gram?: integer;
    min_gram?: integer;
    preserve_original?: SpecUtilsStringified<boolean>;
}
export interface AnalysisNGramTokenizer extends AnalysisTokenizerBase {
    type: 'ngram';
    custom_token_chars?: string;
    max_gram: integer;
    min_gram: integer;
    token_chars: AnalysisTokenChar[];
}
export interface AnalysisNoriAnalyzer {
    type: 'nori';
    version?: VersionString;
    decompound_mode?: AnalysisNoriDecompoundMode;
    stoptags?: string[];
    user_dictionary?: string;
}
export type AnalysisNoriDecompoundMode = 'discard' | 'none' | 'mixed';
export interface AnalysisNoriPartOfSpeechTokenFilter extends AnalysisTokenFilterBase {
    type: 'nori_part_of_speech';
    stoptags?: string[];
}
export interface AnalysisNoriTokenizer extends AnalysisTokenizerBase {
    type: 'nori_tokenizer';
    decompound_mode?: AnalysisNoriDecompoundMode;
    discard_punctuation?: boolean;
    user_dictionary?: string;
    user_dictionary_rules?: string[];
}
export type AnalysisNormalizer = AnalysisLowercaseNormalizer | AnalysisCustomNormalizer;
export interface AnalysisPathHierarchyTokenizer extends AnalysisTokenizerBase {
    type: 'path_hierarchy';
    buffer_size?: SpecUtilsStringified<integer>;
    delimiter?: string;
    replacement?: string;
    reverse?: SpecUtilsStringified<boolean>;
    skip?: SpecUtilsStringified<integer>;
}
export interface AnalysisPatternAnalyzer {
    type: 'pattern';
    version?: VersionString;
    flags?: string;
    lowercase?: boolean;
    pattern: string;
    stopwords?: AnalysisStopWords;
}
export interface AnalysisPatternCaptureTokenFilter extends AnalysisTokenFilterBase {
    type: 'pattern_capture';
    patterns: string[];
    preserve_original?: SpecUtilsStringified<boolean>;
}
export interface AnalysisPatternReplaceCharFilter extends AnalysisCharFilterBase {
    type: 'pattern_replace';
    flags?: string;
    pattern: string;
    replacement?: string;
}
export interface AnalysisPatternReplaceTokenFilter extends AnalysisTokenFilterBase {
    type: 'pattern_replace';
    all?: boolean;
    flags?: string;
    pattern: string;
    replacement?: string;
}
export interface AnalysisPatternTokenizer extends AnalysisTokenizerBase {
    type: 'pattern';
    flags?: string;
    group?: integer;
    pattern?: string;
}
export type AnalysisPhoneticEncoder = 'metaphone' | 'double_metaphone' | 'soundex' | 'refined_soundex' | 'caverphone1' | 'caverphone2' | 'cologne' | 'nysiis' | 'koelnerphonetik' | 'haasephonetik' | 'beider_morse' | 'daitch_mokotoff';
export type AnalysisPhoneticLanguage = 'any' | 'common' | 'cyrillic' | 'english' | 'french' | 'german' | 'hebrew' | 'hungarian' | 'polish' | 'romanian' | 'russian' | 'spanish';
export type AnalysisPhoneticNameType = 'generic' | 'ashkenazi' | 'sephardic';
export type AnalysisPhoneticRuleType = 'approx' | 'exact';
export interface AnalysisPhoneticTokenFilter extends AnalysisTokenFilterBase {
    type: 'phonetic';
    encoder: AnalysisPhoneticEncoder;
    languageset: AnalysisPhoneticLanguage | AnalysisPhoneticLanguage[];
    max_code_len?: integer;
    name_type: AnalysisPhoneticNameType;
    replace?: boolean;
    rule_type: AnalysisPhoneticRuleType;
}
export interface AnalysisPorterStemTokenFilter extends AnalysisTokenFilterBase {
    type: 'porter_stem';
}
export interface AnalysisPredicateTokenFilter extends AnalysisTokenFilterBase {
    type: 'predicate_token_filter';
    script: Script | string;
}
export interface AnalysisRemoveDuplicatesTokenFilter extends AnalysisTokenFilterBase {
    type: 'remove_duplicates';
}
export interface AnalysisReverseTokenFilter extends AnalysisTokenFilterBase {
    type: 'reverse';
}
export interface AnalysisShingleTokenFilter extends AnalysisTokenFilterBase {
    type: 'shingle';
    filler_token?: string;
    max_shingle_size?: integer | string;
    min_shingle_size?: integer | string;
    output_unigrams?: boolean;
    output_unigrams_if_no_shingles?: boolean;
    token_separator?: string;
}
export interface AnalysisSimpleAnalyzer {
    type: 'simple';
    version?: VersionString;
}
export interface AnalysisSnowballAnalyzer {
    type: 'snowball';
    version?: VersionString;
    language: AnalysisSnowballLanguage;
    stopwords?: AnalysisStopWords;
}
export type AnalysisSnowballLanguage = 'Armenian' | 'Basque' | 'Catalan' | 'Danish' | 'Dutch' | 'English' | 'Finnish' | 'French' | 'German' | 'German2' | 'Hungarian' | 'Italian' | 'Kp' | 'Lovins' | 'Norwegian' | 'Porter' | 'Portuguese' | 'Romanian' | 'Russian' | 'Spanish' | 'Swedish' | 'Turkish';
export interface AnalysisSnowballTokenFilter extends AnalysisTokenFilterBase {
    type: 'snowball';
    language?: AnalysisSnowballLanguage;
}
export interface AnalysisStandardAnalyzer {
    type: 'standard';
    max_token_length?: integer;
    stopwords?: AnalysisStopWords;
}
export interface AnalysisStandardTokenizer extends AnalysisTokenizerBase {
    type: 'standard';
    max_token_length?: integer;
}
export interface AnalysisStemmerOverrideTokenFilter extends AnalysisTokenFilterBase {
    type: 'stemmer_override';
    rules?: string[];
    rules_path?: string;
}
export interface AnalysisStemmerTokenFilter extends AnalysisTokenFilterBase {
    type: 'stemmer';
    language?: string;
    name?: string;
}
export interface AnalysisStopAnalyzer {
    type: 'stop';
    version?: VersionString;
    stopwords?: AnalysisStopWords;
    stopwords_path?: string;
}
export interface AnalysisStopTokenFilter extends AnalysisTokenFilterBase {
    type: 'stop';
    ignore_case?: boolean;
    remove_trailing?: boolean;
    stopwords?: AnalysisStopWords;
    stopwords_path?: string;
}
export type AnalysisStopWords = string | string[];
export type AnalysisSynonymFormat = 'solr' | 'wordnet';
export interface AnalysisSynonymGraphTokenFilter extends AnalysisTokenFilterBase {
    type: 'synonym_graph';
    expand?: boolean;
    format?: AnalysisSynonymFormat;
    lenient?: boolean;
    synonyms?: string[];
    synonyms_path?: string;
    synonyms_set?: string;
    tokenizer?: string;
    updateable?: boolean;
}
export interface AnalysisSynonymTokenFilter extends AnalysisTokenFilterBase {
    type: 'synonym';
    expand?: boolean;
    format?: AnalysisSynonymFormat;
    lenient?: boolean;
    synonyms?: string[];
    synonyms_path?: string;
    synonyms_set?: string;
    tokenizer?: string;
    updateable?: boolean;
}
export type AnalysisTokenChar = 'letter' | 'digit' | 'whitespace' | 'punctuation' | 'symbol' | 'custom';
export type AnalysisTokenFilter = string | AnalysisTokenFilterDefinition;
export interface AnalysisTokenFilterBase {
    version?: VersionString;
}
export type AnalysisTokenFilterDefinition = AnalysisAsciiFoldingTokenFilter | AnalysisCommonGramsTokenFilter | AnalysisConditionTokenFilter | AnalysisDelimitedPayloadTokenFilter | AnalysisEdgeNGramTokenFilter | AnalysisElisionTokenFilter | AnalysisFingerprintTokenFilter | AnalysisHunspellTokenFilter | AnalysisHyphenationDecompounderTokenFilter | AnalysisKeepTypesTokenFilter | AnalysisKeepWordsTokenFilter | AnalysisKeywordMarkerTokenFilter | AnalysisKStemTokenFilter | AnalysisLengthTokenFilter | AnalysisLimitTokenCountTokenFilter | AnalysisLowercaseTokenFilter | AnalysisMultiplexerTokenFilter | AnalysisNGramTokenFilter | AnalysisNoriPartOfSpeechTokenFilter | AnalysisPatternCaptureTokenFilter | AnalysisPatternReplaceTokenFilter | AnalysisPorterStemTokenFilter | AnalysisPredicateTokenFilter | AnalysisRemoveDuplicatesTokenFilter | AnalysisReverseTokenFilter | AnalysisShingleTokenFilter | AnalysisSnowballTokenFilter | AnalysisStemmerOverrideTokenFilter | AnalysisStemmerTokenFilter | AnalysisStopTokenFilter | AnalysisSynonymGraphTokenFilter | AnalysisSynonymTokenFilter | AnalysisTrimTokenFilter | AnalysisTruncateTokenFilter | AnalysisUniqueTokenFilter | AnalysisUppercaseTokenFilter | AnalysisWordDelimiterGraphTokenFilter | AnalysisWordDelimiterTokenFilter | AnalysisKuromojiStemmerTokenFilter | AnalysisKuromojiReadingFormTokenFilter | AnalysisKuromojiPartOfSpeechTokenFilter | AnalysisIcuCollationTokenFilter | AnalysisIcuFoldingTokenFilter | AnalysisIcuNormalizationTokenFilter | AnalysisIcuTransformTokenFilter | AnalysisPhoneticTokenFilter | AnalysisDictionaryDecompounderTokenFilter;
export type AnalysisTokenizer = string | AnalysisTokenizerDefinition;
export interface AnalysisTokenizerBase {
    version?: VersionString;
}
export type AnalysisTokenizerDefinition = AnalysisCharGroupTokenizer | AnalysisEdgeNGramTokenizer | AnalysisKeywordTokenizer | AnalysisLetterTokenizer | AnalysisLowercaseTokenizer | AnalysisNGramTokenizer | AnalysisNoriTokenizer | AnalysisPathHierarchyTokenizer | AnalysisStandardTokenizer | AnalysisUaxEmailUrlTokenizer | AnalysisWhitespaceTokenizer | AnalysisKuromojiTokenizer | AnalysisPatternTokenizer | AnalysisIcuTokenizer;
export interface AnalysisTrimTokenFilter extends AnalysisTokenFilterBase {
    type: 'trim';
}
export interface AnalysisTruncateTokenFilter extends AnalysisTokenFilterBase {
    type: 'truncate';
    length?: integer;
}
export interface AnalysisUaxEmailUrlTokenizer extends AnalysisTokenizerBase {
    type: 'uax_url_email';
    max_token_length?: integer;
}
export interface AnalysisUniqueTokenFilter extends AnalysisTokenFilterBase {
    type: 'unique';
    only_on_same_position?: boolean;
}
export interface AnalysisUppercaseTokenFilter extends AnalysisTokenFilterBase {
    type: 'uppercase';
}
export interface AnalysisWhitespaceAnalyzer {
    type: 'whitespace';
    version?: VersionString;
}
export interface AnalysisWhitespaceTokenizer extends AnalysisTokenizerBase {
    type: 'whitespace';
    max_token_length?: integer;
}
export interface AnalysisWordDelimiterGraphTokenFilter extends AnalysisTokenFilterBase {
    type: 'word_delimiter_graph';
    adjust_offsets?: boolean;
    catenate_all?: boolean;
    catenate_numbers?: boolean;
    catenate_words?: boolean;
    generate_number_parts?: boolean;
    generate_word_parts?: boolean;
    ignore_keywords?: boolean;
    preserve_original?: SpecUtilsStringified<boolean>;
    protected_words?: string[];
    protected_words_path?: string;
    split_on_case_change?: boolean;
    split_on_numerics?: boolean;
    stem_english_possessive?: boolean;
    type_table?: string[];
    type_table_path?: string;
}
export interface AnalysisWordDelimiterTokenFilter extends AnalysisTokenFilterBase {
    type: 'word_delimiter';
    catenate_all?: boolean;
    catenate_numbers?: boolean;
    catenate_words?: boolean;
    generate_number_parts?: boolean;
    generate_word_parts?: boolean;
    preserve_original?: SpecUtilsStringified<boolean>;
    protected_words?: string[];
    protected_words_path?: string;
    split_on_case_change?: boolean;
    split_on_numerics?: boolean;
    stem_english_possessive?: boolean;
    type_table?: string[];
    type_table_path?: string;
}
export interface MappingAggregateMetricDoubleProperty extends MappingPropertyBase {
    type: 'aggregate_metric_double';
    default_metric: string;
    metrics: string[];
    time_series_metric?: MappingTimeSeriesMetricType;
}
export interface MappingAllField {
    analyzer: string;
    enabled: boolean;
    omit_norms: boolean;
    search_analyzer: string;
    similarity: string;
    store: boolean;
    store_term_vector_offsets: boolean;
    store_term_vector_payloads: boolean;
    store_term_vector_positions: boolean;
    store_term_vectors: boolean;
}
export interface MappingBinaryProperty extends MappingDocValuesPropertyBase {
    type: 'binary';
}
export interface MappingBooleanProperty extends MappingDocValuesPropertyBase {
    boost?: double;
    fielddata?: IndicesNumericFielddata;
    index?: boolean;
    null_value?: boolean;
    type: 'boolean';
}
export interface MappingByteNumberProperty extends MappingNumberPropertyBase {
    type: 'byte';
    null_value?: byte;
}
export interface MappingCompletionProperty extends MappingDocValuesPropertyBase {
    analyzer?: string;
    contexts?: MappingSuggestContext[];
    max_input_length?: integer;
    preserve_position_increments?: boolean;
    preserve_separators?: boolean;
    search_analyzer?: string;
    type: 'completion';
}
export interface MappingConstantKeywordProperty extends MappingPropertyBase {
    value?: any;
    type: 'constant_keyword';
}
export interface MappingCorePropertyBase extends MappingPropertyBase {
    copy_to?: Fields;
    similarity?: string;
    store?: boolean;
}
export interface MappingDataStreamTimestamp {
    enabled: boolean;
}
export interface MappingDateNanosProperty extends MappingDocValuesPropertyBase {
    boost?: double;
    format?: string;
    ignore_malformed?: boolean;
    index?: boolean;
    null_value?: DateTime;
    precision_step?: integer;
    type: 'date_nanos';
}
export interface MappingDateProperty extends MappingDocValuesPropertyBase {
    boost?: double;
    fielddata?: IndicesNumericFielddata;
    format?: string;
    ignore_malformed?: boolean;
    index?: boolean;
    null_value?: DateTime;
    precision_step?: integer;
    locale?: string;
    type: 'date';
}
export interface MappingDateRangeProperty extends MappingRangePropertyBase {
    format?: string;
    type: 'date_range';
}
export interface MappingDenseVectorIndexOptions {
    type: string;
    m?: integer;
    ef_construction?: integer;
    confidence_interval?: float;
}
export interface MappingDenseVectorProperty extends MappingPropertyBase {
    type: 'dense_vector';
    element_type?: string;
    dims?: integer;
    similarity?: string;
    index?: boolean;
    index_options?: MappingDenseVectorIndexOptions;
}
export interface MappingDocValuesPropertyBase extends MappingCorePropertyBase {
    doc_values?: boolean;
}
export interface MappingDoubleNumberProperty extends MappingNumberPropertyBase {
    type: 'double';
    null_value?: double;
}
export interface MappingDoubleRangeProperty extends MappingRangePropertyBase {
    type: 'double_range';
}
export type MappingDynamicMapping = boolean | 'strict' | 'runtime' | 'true' | 'false';
export interface MappingDynamicProperty extends MappingDocValuesPropertyBase {
    type: '{dynamic_type}';
    enabled?: boolean;
    null_value?: FieldValue;
    boost?: double;
    coerce?: boolean;
    script?: Script | string;
    on_script_error?: MappingOnScriptError;
    ignore_malformed?: boolean;
    time_series_metric?: MappingTimeSeriesMetricType;
    analyzer?: string;
    eager_global_ordinals?: boolean;
    index?: boolean;
    index_options?: MappingIndexOptions;
    index_phrases?: boolean;
    index_prefixes?: MappingTextIndexPrefixes;
    norms?: boolean;
    position_increment_gap?: integer;
    search_analyzer?: string;
    search_quote_analyzer?: string;
    term_vector?: MappingTermVectorOption;
    format?: string;
    precision_step?: integer;
    locale?: string;
}
export interface MappingDynamicTemplate {
    mapping?: MappingProperty;
    runtime?: MappingProperty;
    match?: string | string[];
    path_match?: string | string[];
    unmatch?: string | string[];
    path_unmatch?: string | string[];
    match_mapping_type?: string | string[];
    unmatch_mapping_type?: string | string[];
    match_pattern?: MappingMatchType;
}
export interface MappingFieldAliasProperty extends MappingPropertyBase {
    path?: Field;
    type: 'alias';
}
export interface MappingFieldMapping {
    full_name: string;
    mapping: Partial<Record<Field, MappingProperty>>;
}
export interface MappingFieldNamesField {
    enabled: boolean;
}
export type MappingFieldType = 'none' | 'geo_point' | 'geo_shape' | 'ip' | 'binary' | 'keyword' | 'text' | 'search_as_you_type' | 'date' | 'date_nanos' | 'boolean' | 'completion' | 'nested' | 'object' | 'version' | 'murmur3' | 'token_count' | 'percolator' | 'integer' | 'long' | 'short' | 'byte' | 'float' | 'half_float' | 'scaled_float' | 'double' | 'integer_range' | 'float_range' | 'long_range' | 'double_range' | 'date_range' | 'ip_range' | 'alias' | 'join' | 'rank_feature' | 'rank_features' | 'flattened' | 'shape' | 'histogram' | 'constant_keyword' | 'aggregate_metric_double' | 'dense_vector' | 'semantic_text' | 'sparse_vector' | 'match_only_text' | 'icu_collation_keyword';
export interface MappingFlattenedProperty extends MappingPropertyBase {
    boost?: double;
    depth_limit?: integer;
    doc_values?: boolean;
    eager_global_ordinals?: boolean;
    index?: boolean;
    index_options?: MappingIndexOptions;
    null_value?: string;
    similarity?: string;
    split_queries_on_whitespace?: boolean;
    type: 'flattened';
}
export interface MappingFloatNumberProperty extends MappingNumberPropertyBase {
    type: 'float';
    null_value?: float;
}
export interface MappingFloatRangeProperty extends MappingRangePropertyBase {
    type: 'float_range';
}
export type MappingGeoOrientation = 'right' | 'RIGHT' | 'counterclockwise' | 'ccw' | 'left' | 'LEFT' | 'clockwise' | 'cw';
export interface MappingGeoPointProperty extends MappingDocValuesPropertyBase {
    ignore_malformed?: boolean;
    ignore_z_value?: boolean;
    null_value?: GeoLocation;
    index?: boolean;
    on_script_error?: MappingOnScriptError;
    script?: Script | string;
    type: 'geo_point';
}
export interface MappingGeoShapeProperty extends MappingDocValuesPropertyBase {
    coerce?: boolean;
    ignore_malformed?: boolean;
    ignore_z_value?: boolean;
    orientation?: MappingGeoOrientation;
    strategy?: MappingGeoStrategy;
    type: 'geo_shape';
}
export type MappingGeoStrategy = 'recursive' | 'term';
export interface MappingHalfFloatNumberProperty extends MappingNumberPropertyBase {
    type: 'half_float';
    null_value?: float;
}
export interface MappingHistogramProperty extends MappingPropertyBase {
    ignore_malformed?: boolean;
    type: 'histogram';
}
export interface MappingIcuCollationProperty extends MappingDocValuesPropertyBase {
    type: 'icu_collation_keyword';
    norms?: boolean;
    index_options?: MappingIndexOptions;
    index?: boolean;
    null_value?: string;
    rules?: string;
    language?: string;
    country?: string;
    variant?: string;
    strength?: AnalysisIcuCollationStrength;
    decomposition?: AnalysisIcuCollationDecomposition;
    alternate?: AnalysisIcuCollationAlternate;
    case_level?: boolean;
    case_first?: AnalysisIcuCollationCaseFirst;
    numeric?: boolean;
    variable_top?: string;
    hiragana_quaternary_mode?: boolean;
}
export interface MappingIndexField {
    enabled: boolean;
}
export type MappingIndexOptions = 'docs' | 'freqs' | 'positions' | 'offsets';
export interface MappingIntegerNumberProperty extends MappingNumberPropertyBase {
    type: 'integer';
    null_value?: integer;
}
export interface MappingIntegerRangeProperty extends MappingRangePropertyBase {
    type: 'integer_range';
}
export interface MappingIpProperty extends MappingDocValuesPropertyBase {
    boost?: double;
    index?: boolean;
    ignore_malformed?: boolean;
    null_value?: string;
    on_script_error?: MappingOnScriptError;
    script?: Script | string;
    time_series_dimension?: boolean;
    type: 'ip';
}
export interface MappingIpRangeProperty extends MappingRangePropertyBase {
    type: 'ip_range';
}
export interface MappingJoinProperty extends MappingPropertyBase {
    relations?: Record<RelationName, RelationName | RelationName[]>;
    eager_global_ordinals?: boolean;
    type: 'join';
}
export interface MappingKeywordProperty extends MappingDocValuesPropertyBase {
    boost?: double;
    eager_global_ordinals?: boolean;
    index?: boolean;
    index_options?: MappingIndexOptions;
    script?: Script | string;
    on_script_error?: MappingOnScriptError;
    normalizer?: string;
    norms?: boolean;
    null_value?: string;
    split_queries_on_whitespace?: boolean;
    time_series_dimension?: boolean;
    type: 'keyword';
}
export interface MappingLongNumberProperty extends MappingNumberPropertyBase {
    type: 'long';
    null_value?: long;
}
export interface MappingLongRangeProperty extends MappingRangePropertyBase {
    type: 'long_range';
}
export interface MappingMatchOnlyTextProperty {
    type: 'match_only_text';
    fields?: Record<PropertyName, MappingProperty>;
    meta?: Record<string, string>;
    copy_to?: Fields;
}
export type MappingMatchType = 'simple' | 'regex';
export interface MappingMurmur3HashProperty extends MappingDocValuesPropertyBase {
    type: 'murmur3';
}
export interface MappingNestedProperty extends MappingCorePropertyBase {
    enabled?: boolean;
    include_in_parent?: boolean;
    include_in_root?: boolean;
    type: 'nested';
}
export interface MappingNumberPropertyBase extends MappingDocValuesPropertyBase {
    boost?: double;
    coerce?: boolean;
    ignore_malformed?: boolean;
    index?: boolean;
    on_script_error?: MappingOnScriptError;
    script?: Script | string;
    time_series_metric?: MappingTimeSeriesMetricType;
    time_series_dimension?: boolean;
}
export interface MappingObjectProperty extends MappingCorePropertyBase {
    enabled?: boolean;
    subobjects?: boolean;
    type?: 'object';
}
export type MappingOnScriptError = 'fail' | 'continue';
export interface MappingPercolatorProperty extends MappingPropertyBase {
    type: 'percolator';
}
export interface MappingPointProperty extends MappingDocValuesPropertyBase {
    ignore_malformed?: boolean;
    ignore_z_value?: boolean;
    null_value?: string;
    type: 'point';
}
export type MappingProperty = MappingBinaryProperty | MappingBooleanProperty | MappingDynamicProperty | MappingJoinProperty | MappingKeywordProperty | MappingMatchOnlyTextProperty | MappingPercolatorProperty | MappingRankFeatureProperty | MappingRankFeaturesProperty | MappingSearchAsYouTypeProperty | MappingTextProperty | MappingVersionProperty | MappingWildcardProperty | MappingDateNanosProperty | MappingDateProperty | MappingAggregateMetricDoubleProperty | MappingDenseVectorProperty | MappingFlattenedProperty | MappingNestedProperty | MappingObjectProperty | MappingSemanticTextProperty | MappingSparseVectorProperty | MappingCompletionProperty | MappingConstantKeywordProperty | MappingFieldAliasProperty | MappingHistogramProperty | MappingIpProperty | MappingMurmur3HashProperty | MappingTokenCountProperty | MappingGeoPointProperty | MappingGeoShapeProperty | MappingPointProperty | MappingShapeProperty | MappingByteNumberProperty | MappingDoubleNumberProperty | MappingFloatNumberProperty | MappingHalfFloatNumberProperty | MappingIntegerNumberProperty | MappingLongNumberProperty | MappingScaledFloatNumberProperty | MappingShortNumberProperty | MappingUnsignedLongNumberProperty | MappingDateRangeProperty | MappingDoubleRangeProperty | MappingFloatRangeProperty | MappingIntegerRangeProperty | MappingIpRangeProperty | MappingLongRangeProperty | MappingIcuCollationProperty;
export interface MappingPropertyBase {
    meta?: Record<string, string>;
    properties?: Record<PropertyName, MappingProperty>;
    ignore_above?: integer;
    dynamic?: MappingDynamicMapping;
    fields?: Record<PropertyName, MappingProperty>;
}
export interface MappingRangePropertyBase extends MappingDocValuesPropertyBase {
    boost?: double;
    coerce?: boolean;
    index?: boolean;
}
export interface MappingRankFeatureProperty extends MappingPropertyBase {
    positive_score_impact?: boolean;
    type: 'rank_feature';
}
export interface MappingRankFeaturesProperty extends MappingPropertyBase {
    positive_score_impact?: boolean;
    type: 'rank_features';
}
export interface MappingRoutingField {
    required: boolean;
}
export interface MappingRuntimeField {
    fetch_fields?: (MappingRuntimeFieldFetchFields | Field)[];
    format?: string;
    input_field?: Field;
    target_field?: Field;
    target_index?: IndexName;
    script?: Script | string;
    type: MappingRuntimeFieldType;
}
export interface MappingRuntimeFieldFetchFields {
    field: Field;
    format?: string;
}
export type MappingRuntimeFieldType = 'boolean' | 'composite' | 'date' | 'double' | 'geo_point' | 'ip' | 'keyword' | 'long' | 'lookup';
export type MappingRuntimeFields = Record<Field, MappingRuntimeField>;
export interface MappingScaledFloatNumberProperty extends MappingNumberPropertyBase {
    type: 'scaled_float';
    null_value?: double;
    scaling_factor?: double;
}
export interface MappingSearchAsYouTypeProperty extends MappingCorePropertyBase {
    analyzer?: string;
    index?: boolean;
    index_options?: MappingIndexOptions;
    max_shingle_size?: integer;
    norms?: boolean;
    search_analyzer?: string;
    search_quote_analyzer?: string;
    term_vector?: MappingTermVectorOption;
    type: 'search_as_you_type';
}
export interface MappingSemanticTextProperty {
    type: 'semantic_text';
    meta?: Record<string, string>;
    inference_id: Id;
}
export interface MappingShapeProperty extends MappingDocValuesPropertyBase {
    coerce?: boolean;
    ignore_malformed?: boolean;
    ignore_z_value?: boolean;
    orientation?: MappingGeoOrientation;
    type: 'shape';
}
export interface MappingShortNumberProperty extends MappingNumberPropertyBase {
    type: 'short';
    null_value?: short;
}
export interface MappingSizeField {
    enabled: boolean;
}
export interface MappingSourceField {
    compress?: boolean;
    compress_threshold?: string;
    enabled?: boolean;
    excludes?: string[];
    includes?: string[];
    mode?: MappingSourceFieldMode;
}
export type MappingSourceFieldMode = 'disabled' | 'stored' | 'synthetic';
export interface MappingSparseVectorProperty extends MappingPropertyBase {
    type: 'sparse_vector';
}
export interface MappingSuggestContext {
    name: Name;
    path?: Field;
    type: string;
    precision?: integer | string;
}
export type MappingTermVectorOption = 'no' | 'yes' | 'with_offsets' | 'with_positions' | 'with_positions_offsets' | 'with_positions_offsets_payloads' | 'with_positions_payloads';
export interface MappingTextIndexPrefixes {
    max_chars: integer;
    min_chars: integer;
}
export interface MappingTextProperty extends MappingCorePropertyBase {
    analyzer?: string;
    boost?: double;
    eager_global_ordinals?: boolean;
    fielddata?: boolean;
    fielddata_frequency_filter?: IndicesFielddataFrequencyFilter;
    index?: boolean;
    index_options?: MappingIndexOptions;
    index_phrases?: boolean;
    index_prefixes?: MappingTextIndexPrefixes;
    norms?: boolean;
    position_increment_gap?: integer;
    search_analyzer?: string;
    search_quote_analyzer?: string;
    term_vector?: MappingTermVectorOption;
    type: 'text';
}
export type MappingTimeSeriesMetricType = 'gauge' | 'counter' | 'summary' | 'histogram' | 'position';
export interface MappingTokenCountProperty extends MappingDocValuesPropertyBase {
    analyzer?: string;
    boost?: double;
    index?: boolean;
    null_value?: double;
    enable_position_increments?: boolean;
    type: 'token_count';
}
export interface MappingTypeMapping {
    all_field?: MappingAllField;
    date_detection?: boolean;
    dynamic?: MappingDynamicMapping;
    dynamic_date_formats?: string[];
    dynamic_templates?: Record<string, MappingDynamicTemplate>[];
    _field_names?: MappingFieldNamesField;
    index_field?: MappingIndexField;
    _meta?: Metadata;
    numeric_detection?: boolean;
    properties?: Record<PropertyName, MappingProperty>;
    _routing?: MappingRoutingField;
    _size?: MappingSizeField;
    _source?: MappingSourceField;
    runtime?: Record<string, MappingRuntimeField>;
    enabled?: boolean;
    subobjects?: boolean;
    _data_stream_timestamp?: MappingDataStreamTimestamp;
}
export interface MappingUnsignedLongNumberProperty extends MappingNumberPropertyBase {
    type: 'unsigned_long';
    null_value?: ulong;
}
export interface MappingVersionProperty extends MappingDocValuesPropertyBase {
    type: 'version';
}
export interface MappingWildcardProperty extends MappingDocValuesPropertyBase {
    type: 'wildcard';
    null_value?: string;
}
export interface QueryDslBoolQuery extends QueryDslQueryBase {
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    minimum_should_match?: MinimumShouldMatch;
    must?: QueryDslQueryContainer | QueryDslQueryContainer[];
    must_not?: QueryDslQueryContainer | QueryDslQueryContainer[];
    should?: QueryDslQueryContainer | QueryDslQueryContainer[];
}
export interface QueryDslBoostingQuery extends QueryDslQueryBase {
    negative_boost: double;
    negative: QueryDslQueryContainer;
    positive: QueryDslQueryContainer;
}
export type QueryDslChildScoreMode = 'none' | 'avg' | 'sum' | 'max' | 'min';
export type QueryDslCombinedFieldsOperator = 'or' | 'and';
export interface QueryDslCombinedFieldsQuery extends QueryDslQueryBase {
    fields: Field[];
    query: string;
    auto_generate_synonyms_phrase_query?: boolean;
    operator?: QueryDslCombinedFieldsOperator;
    minimum_should_match?: MinimumShouldMatch;
    zero_terms_query?: QueryDslCombinedFieldsZeroTerms;
}
export type QueryDslCombinedFieldsZeroTerms = 'none' | 'all';
export interface QueryDslCommonTermsQuery extends QueryDslQueryBase {
    analyzer?: string;
    cutoff_frequency?: double;
    high_freq_operator?: QueryDslOperator;
    low_freq_operator?: QueryDslOperator;
    minimum_should_match?: MinimumShouldMatch;
    query: string;
}
export interface QueryDslConstantScoreQuery extends QueryDslQueryBase {
    filter: QueryDslQueryContainer;
}
export interface QueryDslDateDecayFunctionKeys extends QueryDslDecayFunctionBase<DateMath, Duration> {
}
export type QueryDslDateDecayFunction = QueryDslDateDecayFunctionKeys & {
    [property: string]: QueryDslDecayPlacement | QueryDslMultiValueMode;
};
export interface QueryDslDateDistanceFeatureQuery extends QueryDslDistanceFeatureQueryBase<DateMath, Duration> {
}
export interface QueryDslDateRangeQuery extends QueryDslRangeQueryBase<DateMath> {
    format?: DateFormat;
    time_zone?: TimeZone;
}
export type QueryDslDecayFunction = QueryDslUntypedDecayFunction | QueryDslDateDecayFunction | QueryDslNumericDecayFunction | QueryDslGeoDecayFunction;
export interface QueryDslDecayFunctionBase<TOrigin = unknown, TScale = unknown> {
    multi_value_mode?: QueryDslMultiValueMode;
}
export interface QueryDslDecayPlacement<TOrigin = unknown, TScale = unknown> {
    decay?: double;
    offset?: TScale;
    scale?: TScale;
    origin?: TOrigin;
}
export interface QueryDslDisMaxQuery extends QueryDslQueryBase {
    queries: QueryDslQueryContainer[];
    tie_breaker?: double;
}
export type QueryDslDistanceFeatureQuery = QueryDslUntypedDistanceFeatureQuery | QueryDslGeoDistanceFeatureQuery | QueryDslDateDistanceFeatureQuery;
export interface QueryDslDistanceFeatureQueryBase<TOrigin = unknown, TDistance = unknown> extends QueryDslQueryBase {
    origin: TOrigin;
    pivot: TDistance;
    field: Field;
}
export interface QueryDslExistsQuery extends QueryDslQueryBase {
    field: Field;
}
export interface QueryDslFieldAndFormat {
    field: Field;
    format?: string;
    include_unmapped?: boolean;
}
export interface QueryDslFieldLookup {
    id: Id;
    index?: IndexName;
    path?: Field;
    routing?: Routing;
}
export type QueryDslFieldValueFactorModifier = 'none' | 'log' | 'log1p' | 'log2p' | 'ln' | 'ln1p' | 'ln2p' | 'square' | 'sqrt' | 'reciprocal';
export interface QueryDslFieldValueFactorScoreFunction {
    field: Field;
    factor?: double;
    missing?: double;
    modifier?: QueryDslFieldValueFactorModifier;
}
export type QueryDslFunctionBoostMode = 'multiply' | 'replace' | 'sum' | 'avg' | 'max' | 'min';
export interface QueryDslFunctionScoreContainer {
    exp?: QueryDslDecayFunction;
    gauss?: QueryDslDecayFunction;
    linear?: QueryDslDecayFunction;
    field_value_factor?: QueryDslFieldValueFactorScoreFunction;
    random_score?: QueryDslRandomScoreFunction;
    script_score?: QueryDslScriptScoreFunction;
    filter?: QueryDslQueryContainer;
    weight?: double;
}
export type QueryDslFunctionScoreMode = 'multiply' | 'sum' | 'avg' | 'first' | 'max' | 'min';
export interface QueryDslFunctionScoreQuery extends QueryDslQueryBase {
    boost_mode?: QueryDslFunctionBoostMode;
    functions?: QueryDslFunctionScoreContainer[];
    max_boost?: double;
    min_score?: double;
    query?: QueryDslQueryContainer;
    score_mode?: QueryDslFunctionScoreMode;
}
export interface QueryDslFuzzyQuery extends QueryDslQueryBase {
    max_expansions?: integer;
    prefix_length?: integer;
    rewrite?: MultiTermQueryRewrite;
    transpositions?: boolean;
    fuzziness?: Fuzziness;
    value: string | double | boolean;
}
export interface QueryDslGeoBoundingBoxQueryKeys extends QueryDslQueryBase {
    type?: QueryDslGeoExecution;
    validation_method?: QueryDslGeoValidationMethod;
    ignore_unmapped?: boolean;
}
export type QueryDslGeoBoundingBoxQuery = QueryDslGeoBoundingBoxQueryKeys & {
    [property: string]: GeoBounds | QueryDslGeoExecution | QueryDslGeoValidationMethod | boolean | float | string;
};
export interface QueryDslGeoDecayFunctionKeys extends QueryDslDecayFunctionBase<GeoLocation, Distance> {
}
export type QueryDslGeoDecayFunction = QueryDslGeoDecayFunctionKeys & {
    [property: string]: QueryDslDecayPlacement | QueryDslMultiValueMode;
};
export interface QueryDslGeoDistanceFeatureQuery extends QueryDslDistanceFeatureQueryBase<GeoLocation, Distance> {
}
export interface QueryDslGeoDistanceQueryKeys extends QueryDslQueryBase {
    distance: Distance;
    distance_type?: GeoDistanceType;
    validation_method?: QueryDslGeoValidationMethod;
    ignore_unmapped?: boolean;
}
export type QueryDslGeoDistanceQuery = QueryDslGeoDistanceQueryKeys & {
    [property: string]: GeoLocation | Distance | GeoDistanceType | QueryDslGeoValidationMethod | boolean | float | string;
};
export type QueryDslGeoExecution = 'memory' | 'indexed';
export interface QueryDslGeoPolygonPoints {
    points: GeoLocation[];
}
export interface QueryDslGeoPolygonQueryKeys extends QueryDslQueryBase {
    validation_method?: QueryDslGeoValidationMethod;
    ignore_unmapped?: boolean;
}
export type QueryDslGeoPolygonQuery = QueryDslGeoPolygonQueryKeys & {
    [property: string]: QueryDslGeoPolygonPoints | QueryDslGeoValidationMethod | boolean | float | string;
};
export interface QueryDslGeoShapeFieldQuery {
    shape?: GeoShape;
    indexed_shape?: QueryDslFieldLookup;
    relation?: GeoShapeRelation;
}
export interface QueryDslGeoShapeQueryKeys extends QueryDslQueryBase {
    ignore_unmapped?: boolean;
}
export type QueryDslGeoShapeQuery = QueryDslGeoShapeQueryKeys & {
    [property: string]: QueryDslGeoShapeFieldQuery | boolean | float | string;
};
export type QueryDslGeoValidationMethod = 'coerce' | 'ignore_malformed' | 'strict';
export interface QueryDslHasChildQuery extends QueryDslQueryBase {
    ignore_unmapped?: boolean;
    inner_hits?: SearchInnerHits;
    max_children?: integer;
    min_children?: integer;
    query: QueryDslQueryContainer;
    score_mode?: QueryDslChildScoreMode;
    type: RelationName;
}
export interface QueryDslHasParentQuery extends QueryDslQueryBase {
    ignore_unmapped?: boolean;
    inner_hits?: SearchInnerHits;
    parent_type: RelationName;
    query: QueryDslQueryContainer;
    score?: boolean;
}
export interface QueryDslIdsQuery extends QueryDslQueryBase {
    values?: Ids;
}
export interface QueryDslIntervalsAllOf {
    intervals: QueryDslIntervalsContainer[];
    max_gaps?: integer;
    ordered?: boolean;
    filter?: QueryDslIntervalsFilter;
}
export interface QueryDslIntervalsAnyOf {
    intervals: QueryDslIntervalsContainer[];
    filter?: QueryDslIntervalsFilter;
}
export interface QueryDslIntervalsContainer {
    all_of?: QueryDslIntervalsAllOf;
    any_of?: QueryDslIntervalsAnyOf;
    fuzzy?: QueryDslIntervalsFuzzy;
    match?: QueryDslIntervalsMatch;
    prefix?: QueryDslIntervalsPrefix;
    wildcard?: QueryDslIntervalsWildcard;
}
export interface QueryDslIntervalsFilter {
    after?: QueryDslIntervalsContainer;
    before?: QueryDslIntervalsContainer;
    contained_by?: QueryDslIntervalsContainer;
    containing?: QueryDslIntervalsContainer;
    not_contained_by?: QueryDslIntervalsContainer;
    not_containing?: QueryDslIntervalsContainer;
    not_overlapping?: QueryDslIntervalsContainer;
    overlapping?: QueryDslIntervalsContainer;
    script?: Script | string;
}
export interface QueryDslIntervalsFuzzy {
    analyzer?: string;
    fuzziness?: Fuzziness;
    prefix_length?: integer;
    term: string;
    transpositions?: boolean;
    use_field?: Field;
}
export interface QueryDslIntervalsMatch {
    analyzer?: string;
    max_gaps?: integer;
    ordered?: boolean;
    query: string;
    use_field?: Field;
    filter?: QueryDslIntervalsFilter;
}
export interface QueryDslIntervalsPrefix {
    analyzer?: string;
    prefix: string;
    use_field?: Field;
}
export interface QueryDslIntervalsQuery extends QueryDslQueryBase {
    all_of?: QueryDslIntervalsAllOf;
    any_of?: QueryDslIntervalsAnyOf;
    fuzzy?: QueryDslIntervalsFuzzy;
    match?: QueryDslIntervalsMatch;
    prefix?: QueryDslIntervalsPrefix;
    wildcard?: QueryDslIntervalsWildcard;
}
export interface QueryDslIntervalsWildcard {
    analyzer?: string;
    pattern: string;
    use_field?: Field;
}
export type QueryDslLike = string | QueryDslLikeDocument;
export interface QueryDslLikeDocument {
    doc?: any;
    fields?: Field[];
    _id?: Id;
    _index?: IndexName;
    per_field_analyzer?: Record<Field, string>;
    routing?: Routing;
    version?: VersionNumber;
    version_type?: VersionType;
}
export interface QueryDslMatchAllQuery extends QueryDslQueryBase {
}
export interface QueryDslMatchBoolPrefixQuery extends QueryDslQueryBase {
    analyzer?: string;
    fuzziness?: Fuzziness;
    fuzzy_rewrite?: MultiTermQueryRewrite;
    fuzzy_transpositions?: boolean;
    max_expansions?: integer;
    minimum_should_match?: MinimumShouldMatch;
    operator?: QueryDslOperator;
    prefix_length?: integer;
    query: string;
}
export interface QueryDslMatchNoneQuery extends QueryDslQueryBase {
}
export interface QueryDslMatchPhrasePrefixQuery extends QueryDslQueryBase {
    analyzer?: string;
    max_expansions?: integer;
    query: string;
    slop?: integer;
    zero_terms_query?: QueryDslZeroTermsQuery;
}
export interface QueryDslMatchPhraseQuery extends QueryDslQueryBase {
    analyzer?: string;
    query: string;
    slop?: integer;
    zero_terms_query?: QueryDslZeroTermsQuery;
}
export interface QueryDslMatchQuery extends QueryDslQueryBase {
    analyzer?: string;
    auto_generate_synonyms_phrase_query?: boolean;
    cutoff_frequency?: double;
    fuzziness?: Fuzziness;
    fuzzy_rewrite?: MultiTermQueryRewrite;
    fuzzy_transpositions?: boolean;
    lenient?: boolean;
    max_expansions?: integer;
    minimum_should_match?: MinimumShouldMatch;
    operator?: QueryDslOperator;
    prefix_length?: integer;
    query: string | float | boolean;
    zero_terms_query?: QueryDslZeroTermsQuery;
}
export interface QueryDslMoreLikeThisQuery extends QueryDslQueryBase {
    analyzer?: string;
    boost_terms?: double;
    fail_on_unsupported_field?: boolean;
    fields?: Field[];
    include?: boolean;
    like: QueryDslLike | QueryDslLike[];
    max_doc_freq?: integer;
    max_query_terms?: integer;
    max_word_length?: integer;
    min_doc_freq?: integer;
    minimum_should_match?: MinimumShouldMatch;
    min_term_freq?: integer;
    min_word_length?: integer;
    routing?: Routing;
    stop_words?: AnalysisStopWords;
    unlike?: QueryDslLike | QueryDslLike[];
    version?: VersionNumber;
    version_type?: VersionType;
}
export interface QueryDslMultiMatchQuery extends QueryDslQueryBase {
    analyzer?: string;
    auto_generate_synonyms_phrase_query?: boolean;
    cutoff_frequency?: double;
    fields?: Fields;
    fuzziness?: Fuzziness;
    fuzzy_rewrite?: MultiTermQueryRewrite;
    fuzzy_transpositions?: boolean;
    lenient?: boolean;
    max_expansions?: integer;
    minimum_should_match?: MinimumShouldMatch;
    operator?: QueryDslOperator;
    prefix_length?: integer;
    query: string;
    slop?: integer;
    tie_breaker?: double;
    type?: QueryDslTextQueryType;
    zero_terms_query?: QueryDslZeroTermsQuery;
}
export type QueryDslMultiValueMode = 'min' | 'max' | 'avg' | 'sum';
export interface QueryDslNestedQuery extends QueryDslQueryBase {
    ignore_unmapped?: boolean;
    inner_hits?: SearchInnerHits;
    path: Field;
    query: QueryDslQueryContainer;
    score_mode?: QueryDslChildScoreMode;
}
export interface QueryDslNumberRangeQuery extends QueryDslRangeQueryBase<double> {
}
export interface QueryDslNumericDecayFunctionKeys extends QueryDslDecayFunctionBase<double, double> {
}
export type QueryDslNumericDecayFunction = QueryDslNumericDecayFunctionKeys & {
    [property: string]: QueryDslDecayPlacement | QueryDslMultiValueMode;
};
export type QueryDslOperator = 'and' | 'AND' | 'or' | 'OR';
export interface QueryDslParentIdQuery extends QueryDslQueryBase {
    id?: Id;
    ignore_unmapped?: boolean;
    type?: RelationName;
}
export interface QueryDslPercolateQuery extends QueryDslQueryBase {
    document?: any;
    documents?: any[];
    field: Field;
    id?: Id;
    index?: IndexName;
    name?: string;
    preference?: string;
    routing?: Routing;
    version?: VersionNumber;
}
export interface QueryDslPinnedDoc {
    _id: Id;
    _index: IndexName;
}
export interface QueryDslPinnedQuery extends QueryDslQueryBase {
    organic: QueryDslQueryContainer;
    ids?: Id[];
    docs?: QueryDslPinnedDoc[];
}
export interface QueryDslPrefixQuery extends QueryDslQueryBase {
    rewrite?: MultiTermQueryRewrite;
    value: string;
    case_insensitive?: boolean;
}
export interface QueryDslQueryBase {
    boost?: float;
    _name?: string;
}
export interface QueryDslQueryContainer {
    bool?: QueryDslBoolQuery;
    boosting?: QueryDslBoostingQuery;
    common?: Partial<Record<Field, QueryDslCommonTermsQuery | string>>;
    combined_fields?: QueryDslCombinedFieldsQuery;
    constant_score?: QueryDslConstantScoreQuery;
    dis_max?: QueryDslDisMaxQuery;
    distance_feature?: QueryDslDistanceFeatureQuery;
    exists?: QueryDslExistsQuery;
    function_score?: QueryDslFunctionScoreQuery;
    fuzzy?: Partial<Record<Field, QueryDslFuzzyQuery | string | double | boolean>>;
    geo_bounding_box?: QueryDslGeoBoundingBoxQuery;
    geo_distance?: QueryDslGeoDistanceQuery;
    geo_polygon?: QueryDslGeoPolygonQuery;
    geo_shape?: QueryDslGeoShapeQuery;
    has_child?: QueryDslHasChildQuery;
    has_parent?: QueryDslHasParentQuery;
    ids?: QueryDslIdsQuery;
    intervals?: Partial<Record<Field, QueryDslIntervalsQuery>>;
    knn?: KnnQuery;
    match?: Partial<Record<Field, QueryDslMatchQuery | string | float | boolean>>;
    match_all?: QueryDslMatchAllQuery;
    match_bool_prefix?: Partial<Record<Field, QueryDslMatchBoolPrefixQuery | string>>;
    match_none?: QueryDslMatchNoneQuery;
    match_phrase?: Partial<Record<Field, QueryDslMatchPhraseQuery | string>>;
    match_phrase_prefix?: Partial<Record<Field, QueryDslMatchPhrasePrefixQuery | string>>;
    more_like_this?: QueryDslMoreLikeThisQuery;
    multi_match?: QueryDslMultiMatchQuery;
    nested?: QueryDslNestedQuery;
    parent_id?: QueryDslParentIdQuery;
    percolate?: QueryDslPercolateQuery;
    pinned?: QueryDslPinnedQuery;
    prefix?: Partial<Record<Field, QueryDslPrefixQuery | string>>;
    query_string?: QueryDslQueryStringQuery;
    range?: Partial<Record<Field, QueryDslRangeQuery>>;
    rank_feature?: QueryDslRankFeatureQuery;
    regexp?: Partial<Record<Field, QueryDslRegexpQuery | string>>;
    rule?: QueryDslRuleQuery;
    script?: QueryDslScriptQuery;
    script_score?: QueryDslScriptScoreQuery;
    semantic?: QueryDslSemanticQuery;
    shape?: QueryDslShapeQuery;
    simple_query_string?: QueryDslSimpleQueryStringQuery;
    span_containing?: QueryDslSpanContainingQuery;
    span_field_masking?: QueryDslSpanFieldMaskingQuery;
    span_first?: QueryDslSpanFirstQuery;
    span_multi?: QueryDslSpanMultiTermQuery;
    span_near?: QueryDslSpanNearQuery;
    span_not?: QueryDslSpanNotQuery;
    span_or?: QueryDslSpanOrQuery;
    span_term?: Partial<Record<Field, QueryDslSpanTermQuery | string>>;
    span_within?: QueryDslSpanWithinQuery;
    sparse_vector?: QueryDslSparseVectorQuery;
    term?: Partial<Record<Field, QueryDslTermQuery | FieldValue>>;
    terms?: QueryDslTermsQuery;
    terms_set?: Partial<Record<Field, QueryDslTermsSetQuery>>;
    text_expansion?: Partial<Record<Field, QueryDslTextExpansionQuery>>;
    weighted_tokens?: Partial<Record<Field, QueryDslWeightedTokensQuery>>;
    wildcard?: Partial<Record<Field, QueryDslWildcardQuery | string>>;
    wrapper?: QueryDslWrapperQuery;
    type?: QueryDslTypeQuery;
}
export interface QueryDslQueryStringQuery extends QueryDslQueryBase {
    allow_leading_wildcard?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    auto_generate_synonyms_phrase_query?: boolean;
    default_field?: Field;
    default_operator?: QueryDslOperator;
    enable_position_increments?: boolean;
    escape?: boolean;
    fields?: Field[];
    fuzziness?: Fuzziness;
    fuzzy_max_expansions?: integer;
    fuzzy_prefix_length?: integer;
    fuzzy_rewrite?: MultiTermQueryRewrite;
    fuzzy_transpositions?: boolean;
    lenient?: boolean;
    max_determinized_states?: integer;
    minimum_should_match?: MinimumShouldMatch;
    phrase_slop?: double;
    query: string;
    quote_analyzer?: string;
    quote_field_suffix?: string;
    rewrite?: MultiTermQueryRewrite;
    tie_breaker?: double;
    time_zone?: TimeZone;
    type?: QueryDslTextQueryType;
}
export interface QueryDslRandomScoreFunction {
    field?: Field;
    seed?: long | string;
}
export type QueryDslRangeQuery = QueryDslUntypedRangeQuery | QueryDslDateRangeQuery | QueryDslNumberRangeQuery | QueryDslTermRangeQuery;
export interface QueryDslRangeQueryBase<T = unknown> extends QueryDslQueryBase {
    relation?: QueryDslRangeRelation;
    gt?: T;
    gte?: T;
    lt?: T;
    lte?: T;
    from?: T | null;
    to?: T | null;
}
export type QueryDslRangeRelation = 'within' | 'contains' | 'intersects';
export interface QueryDslRankFeatureFunction {
}
export interface QueryDslRankFeatureFunctionLinear {
}
export interface QueryDslRankFeatureFunctionLogarithm {
    scaling_factor: float;
}
export interface QueryDslRankFeatureFunctionSaturation {
    pivot?: float;
}
export interface QueryDslRankFeatureFunctionSigmoid {
    pivot: float;
    exponent: float;
}
export interface QueryDslRankFeatureQuery extends QueryDslQueryBase {
    field: Field;
    saturation?: QueryDslRankFeatureFunctionSaturation;
    log?: QueryDslRankFeatureFunctionLogarithm;
    linear?: QueryDslRankFeatureFunctionLinear;
    sigmoid?: QueryDslRankFeatureFunctionSigmoid;
}
export interface QueryDslRegexpQuery extends QueryDslQueryBase {
    case_insensitive?: boolean;
    flags?: string;
    max_determinized_states?: integer;
    rewrite?: MultiTermQueryRewrite;
    value: string;
}
export interface QueryDslRuleQuery extends QueryDslQueryBase {
    organic: QueryDslQueryContainer;
    ruleset_ids: Id[];
    match_criteria: any;
}
export interface QueryDslScriptQuery extends QueryDslQueryBase {
    script: Script | string;
}
export interface QueryDslScriptScoreFunction {
    script: Script | string;
}
export interface QueryDslScriptScoreQuery extends QueryDslQueryBase {
    min_score?: float;
    query: QueryDslQueryContainer;
    script: Script | string;
}
export interface QueryDslSemanticQuery extends QueryDslQueryBase {
    field: string;
    query: string;
}
export interface QueryDslShapeFieldQuery {
    indexed_shape?: QueryDslFieldLookup;
    relation?: GeoShapeRelation;
    shape?: GeoShape;
}
export interface QueryDslShapeQueryKeys extends QueryDslQueryBase {
    ignore_unmapped?: boolean;
}
export type QueryDslShapeQuery = QueryDslShapeQueryKeys & {
    [property: string]: QueryDslShapeFieldQuery | boolean | float | string;
};
export type QueryDslSimpleQueryStringFlag = 'NONE' | 'AND' | 'NOT' | 'OR' | 'PREFIX' | 'PHRASE' | 'PRECEDENCE' | 'ESCAPE' | 'WHITESPACE' | 'FUZZY' | 'NEAR' | 'SLOP' | 'ALL';
export type QueryDslSimpleQueryStringFlags = SpecUtilsPipeSeparatedFlags<QueryDslSimpleQueryStringFlag>;
export interface QueryDslSimpleQueryStringQuery extends QueryDslQueryBase {
    analyzer?: string;
    analyze_wildcard?: boolean;
    auto_generate_synonyms_phrase_query?: boolean;
    default_operator?: QueryDslOperator;
    fields?: Field[];
    flags?: QueryDslSimpleQueryStringFlags;
    fuzzy_max_expansions?: integer;
    fuzzy_prefix_length?: integer;
    fuzzy_transpositions?: boolean;
    lenient?: boolean;
    minimum_should_match?: MinimumShouldMatch;
    query: string;
    quote_field_suffix?: string;
}
export interface QueryDslSpanContainingQuery extends QueryDslQueryBase {
    big: QueryDslSpanQuery;
    little: QueryDslSpanQuery;
}
export interface QueryDslSpanFieldMaskingQuery extends QueryDslQueryBase {
    field: Field;
    query: QueryDslSpanQuery;
}
export interface QueryDslSpanFirstQuery extends QueryDslQueryBase {
    end: integer;
    match: QueryDslSpanQuery;
}
export type QueryDslSpanGapQuery = Partial<Record<Field, integer>>;
export interface QueryDslSpanMultiTermQuery extends QueryDslQueryBase {
    match: QueryDslQueryContainer;
}
export interface QueryDslSpanNearQuery extends QueryDslQueryBase {
    clauses: QueryDslSpanQuery[];
    in_order?: boolean;
    slop?: integer;
}
export interface QueryDslSpanNotQuery extends QueryDslQueryBase {
    dist?: integer;
    exclude: QueryDslSpanQuery;
    include: QueryDslSpanQuery;
    post?: integer;
    pre?: integer;
}
export interface QueryDslSpanOrQuery extends QueryDslQueryBase {
    clauses: QueryDslSpanQuery[];
}
export interface QueryDslSpanQuery {
    span_containing?: QueryDslSpanContainingQuery;
    span_field_masking?: QueryDslSpanFieldMaskingQuery;
    span_first?: QueryDslSpanFirstQuery;
    span_gap?: QueryDslSpanGapQuery;
    span_multi?: QueryDslSpanMultiTermQuery;
    span_near?: QueryDslSpanNearQuery;
    span_not?: QueryDslSpanNotQuery;
    span_or?: QueryDslSpanOrQuery;
    span_term?: Partial<Record<Field, QueryDslSpanTermQuery | string>>;
    span_within?: QueryDslSpanWithinQuery;
}
export interface QueryDslSpanTermQuery extends QueryDslQueryBase {
    value: string;
}
export interface QueryDslSpanWithinQuery extends QueryDslQueryBase {
    big: QueryDslSpanQuery;
    little: QueryDslSpanQuery;
}
export interface QueryDslSparseVectorQuery extends QueryDslQueryBase {
    field: Field;
    query_vector?: Record<string, float>;
    inference_id?: Id;
    query?: string;
    prune?: boolean;
    pruning_config?: QueryDslTokenPruningConfig;
}
export interface QueryDslTermQuery extends QueryDslQueryBase {
    value: FieldValue;
    case_insensitive?: boolean;
}
export interface QueryDslTermRangeQuery extends QueryDslRangeQueryBase<string> {
}
export interface QueryDslTermsLookup {
    index: IndexName;
    id: Id;
    path: Field;
    routing?: Routing;
}
export interface QueryDslTermsQueryKeys extends QueryDslQueryBase {
}
export type QueryDslTermsQuery = QueryDslTermsQueryKeys & {
    [property: string]: QueryDslTermsQueryField | float | string;
};
export type QueryDslTermsQueryField = FieldValue[] | QueryDslTermsLookup;
export interface QueryDslTermsSetQuery extends QueryDslQueryBase {
    minimum_should_match_field?: Field;
    minimum_should_match_script?: Script | string;
    terms: string[];
}
export interface QueryDslTextExpansionQuery extends QueryDslQueryBase {
    model_id: string;
    model_text: string;
    pruning_config?: QueryDslTokenPruningConfig;
}
export type QueryDslTextQueryType = 'best_fields' | 'most_fields' | 'cross_fields' | 'phrase' | 'phrase_prefix' | 'bool_prefix';
export interface QueryDslTokenPruningConfig {
    tokens_freq_ratio_threshold?: integer;
    tokens_weight_threshold?: float;
    only_score_pruned_tokens?: boolean;
}
export interface QueryDslTypeQuery extends QueryDslQueryBase {
    value: string;
}
export interface QueryDslUntypedDecayFunctionKeys extends QueryDslDecayFunctionBase<any, any> {
}
export type QueryDslUntypedDecayFunction = QueryDslUntypedDecayFunctionKeys & {
    [property: string]: QueryDslDecayPlacement | QueryDslMultiValueMode;
};
export interface QueryDslUntypedDistanceFeatureQuery extends QueryDslDistanceFeatureQueryBase<any, any> {
}
export interface QueryDslUntypedRangeQuery extends QueryDslRangeQueryBase<any> {
    format?: DateFormat;
    time_zone?: TimeZone;
}
export interface QueryDslWeightedTokensQuery extends QueryDslQueryBase {
    tokens: Record<string, float>;
    pruning_config?: QueryDslTokenPruningConfig;
}
export interface QueryDslWildcardQuery extends QueryDslQueryBase {
    case_insensitive?: boolean;
    rewrite?: MultiTermQueryRewrite;
    value?: string;
    wildcard?: string;
}
export interface QueryDslWrapperQuery extends QueryDslQueryBase {
    query: string;
}
export type QueryDslZeroTermsQuery = 'all' | 'none';
export interface AsyncSearchAsyncSearch<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> {
    aggregations?: TAggregations;
    _clusters?: ClusterStatistics;
    fields?: Record<string, any>;
    hits: SearchHitsMetadata<TDocument>;
    max_score?: double;
    num_reduce_phases?: long;
    profile?: SearchProfile;
    pit_id?: Id;
    _scroll_id?: ScrollId;
    _shards: ShardStatistics;
    suggest?: Record<SuggestionName, SearchSuggest<TDocument>[]>;
    terminated_early?: boolean;
    timed_out: boolean;
    took: long;
}
export interface AsyncSearchAsyncSearchDocumentResponseBase<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> extends AsyncSearchAsyncSearchResponseBase {
    response: AsyncSearchAsyncSearch<TDocument, TAggregations>;
}
export interface AsyncSearchAsyncSearchResponseBase {
    id?: Id;
    is_partial: boolean;
    is_running: boolean;
    expiration_time?: DateTime;
    expiration_time_in_millis: EpochTime<UnitMillis>;
    start_time?: DateTime;
    start_time_in_millis: EpochTime<UnitMillis>;
    completion_time?: DateTime;
    completion_time_in_millis?: EpochTime<UnitMillis>;
}
export interface AsyncSearchDeleteRequest extends RequestBase {
    id: Id;
}
export type AsyncSearchDeleteResponse = AcknowledgedResponseBase;
export interface AsyncSearchGetRequest extends RequestBase {
    id: Id;
    keep_alive?: Duration;
    typed_keys?: boolean;

}
export type AsyncSearchGetResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = AsyncSearchAsyncSearchDocumentResponseBase<TDocument, TAggregations>;
export interface AsyncSearchStatusRequest extends RequestBase {
    id: Id;
}
export type AsyncSearchStatusResponse = AsyncSearchStatusStatusResponseBase;
export interface AsyncSearchStatusStatusResponseBase extends AsyncSearchAsyncSearchResponseBase {
    _shards: ShardStatistics;
    _clusters?: ClusterStatistics;
    completion_status?: integer;
}
export interface AsyncSearchSubmitRequest extends RequestBase {
    index?: Indices;

    keep_on_completion?: boolean;
    keep_alive?: Duration;
    allow_no_indices?: boolean;
    allow_partial_search_results?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    batched_reduce_size?: long;
    ccs_minimize_roundtrips?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    max_concurrent_shard_requests?: long;
    min_compatible_shard_node?: VersionString;
    preference?: string;
    pre_filter_shard_size?: long;
    request_cache?: boolean;
    routing?: Routing;
    scroll?: Duration;
    search_type?: SearchType;
    suggest_field?: Field;
    suggest_mode?: SuggestMode;
    suggest_size?: long;
    suggest_text?: string;
    typed_keys?: boolean;
    rest_total_hits_as_int?: boolean;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    q?: string;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    /** @alias aggregations */
    aggs?: Record<string, AggregationsAggregationContainer>;
    collapse?: SearchFieldCollapse;
    explain?: boolean;
    ext?: Record<string, any>;
    from?: integer;
    highlight?: SearchHighlight;
    track_total_hits?: SearchTrackHits;
    indices_boost?: Record<IndexName, double>[];
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    knn?: KnnSearch | KnnSearch[];
    min_score?: double;
    post_filter?: QueryDslQueryContainer;
    profile?: boolean;
    query?: QueryDslQueryContainer;
    rescore?: SearchRescore | SearchRescore[];
    script_fields?: Record<string, ScriptField>;
    search_after?: SortResults;
    size?: integer;
    slice?: SlicedScroll;
    sort?: Sort;
    _source?: SearchSourceConfig;
    fields?: (QueryDslFieldAndFormat | Field)[];
    suggest?: SearchSuggester;
    terminate_after?: long;

    track_scores?: boolean;
    version?: boolean;
    seq_no_primary_term?: boolean;
    stored_fields?: Fields;
    pit?: SearchPointInTimeReference;
    runtime_mappings?: MappingRuntimeFields;
    stats?: string[];
}
export type AsyncSearchSubmitResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = AsyncSearchAsyncSearchDocumentResponseBase<TDocument, TAggregations>;
export interface AutoscalingAutoscalingPolicy {
    roles: string[];
    deciders: Record<string, any>;
}
export interface AutoscalingDeleteAutoscalingPolicyRequest extends RequestBase {
    name: Name;
}
export type AutoscalingDeleteAutoscalingPolicyResponse = AcknowledgedResponseBase;
export interface AutoscalingGetAutoscalingCapacityAutoscalingCapacity {
    node: AutoscalingGetAutoscalingCapacityAutoscalingResources;
    total: AutoscalingGetAutoscalingCapacityAutoscalingResources;
}
export interface AutoscalingGetAutoscalingCapacityAutoscalingDecider {
    required_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity;
    reason_summary?: string;
    reason_details?: any;
}
export interface AutoscalingGetAutoscalingCapacityAutoscalingDeciders {
    required_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity;
    current_capacity: AutoscalingGetAutoscalingCapacityAutoscalingCapacity;
    current_nodes: AutoscalingGetAutoscalingCapacityAutoscalingNode[];
    deciders: Record<string, AutoscalingGetAutoscalingCapacityAutoscalingDecider>;
}
export interface AutoscalingGetAutoscalingCapacityAutoscalingNode {
    name: NodeName;
}
export interface AutoscalingGetAutoscalingCapacityAutoscalingResources {
    storage: integer;
    memory: integer;
}
export interface AutoscalingGetAutoscalingCapacityRequest extends RequestBase {
}
export interface AutoscalingGetAutoscalingCapacityResponse {
    policies: Record<string, AutoscalingGetAutoscalingCapacityAutoscalingDeciders>;
}
export interface AutoscalingGetAutoscalingPolicyRequest extends RequestBase {
    name: Name;
}
export type AutoscalingGetAutoscalingPolicyResponse = AutoscalingAutoscalingPolicy;
export interface AutoscalingPutAutoscalingPolicyRequest extends RequestBase {
    name: Name;
    policy?: AutoscalingAutoscalingPolicy;
}
export type AutoscalingPutAutoscalingPolicyResponse = AcknowledgedResponseBase;
export type CatCatAnomalyDetectorColumn = 'assignment_explanation' | 'ae' | 'buckets.count' | 'bc' | 'bucketsCount' | 'buckets.time.exp_avg' | 'btea' | 'bucketsTimeExpAvg' | 'buckets.time.exp_avg_hour' | 'bteah' | 'bucketsTimeExpAvgHour' | 'buckets.time.max' | 'btmax' | 'bucketsTimeMax' | 'buckets.time.min' | 'btmin' | 'bucketsTimeMin' | 'buckets.time.total' | 'btt' | 'bucketsTimeTotal' | 'data.buckets' | 'db' | 'dataBuckets' | 'data.earliest_record' | 'der' | 'dataEarliestRecord' | 'data.empty_buckets' | 'deb' | 'dataEmptyBuckets' | 'data.input_bytes' | 'dib' | 'dataInputBytes' | 'data.input_fields' | 'dif' | 'dataInputFields' | 'data.input_records' | 'dir' | 'dataInputRecords' | 'data.invalid_dates' | 'did' | 'dataInvalidDates' | 'data.last' | 'dl' | 'dataLast' | 'data.last_empty_bucket' | 'dleb' | 'dataLastEmptyBucket' | 'data.last_sparse_bucket' | 'dlsb' | 'dataLastSparseBucket' | 'data.latest_record' | 'dlr' | 'dataLatestRecord' | 'data.missing_fields' | 'dmf' | 'dataMissingFields' | 'data.out_of_order_timestamps' | 'doot' | 'dataOutOfOrderTimestamps' | 'data.processed_fields' | 'dpf' | 'dataProcessedFields' | 'data.processed_records' | 'dpr' | 'dataProcessedRecords' | 'data.sparse_buckets' | 'dsb' | 'dataSparseBuckets' | 'forecasts.memory.avg' | 'fmavg' | 'forecastsMemoryAvg' | 'forecasts.memory.max' | 'fmmax' | 'forecastsMemoryMax' | 'forecasts.memory.min' | 'fmmin' | 'forecastsMemoryMin' | 'forecasts.memory.total' | 'fmt' | 'forecastsMemoryTotal' | 'forecasts.records.avg' | 'fravg' | 'forecastsRecordsAvg' | 'forecasts.records.max' | 'frmax' | 'forecastsRecordsMax' | 'forecasts.records.min' | 'frmin' | 'forecastsRecordsMin' | 'forecasts.records.total' | 'frt' | 'forecastsRecordsTotal' | 'forecasts.time.avg' | 'ftavg' | 'forecastsTimeAvg' | 'forecasts.time.max' | 'ftmax' | 'forecastsTimeMax' | 'forecasts.time.min' | 'ftmin' | 'forecastsTimeMin' | 'forecasts.time.total' | 'ftt' | 'forecastsTimeTotal' | 'forecasts.total' | 'ft' | 'forecastsTotal' | 'id' | 'model.bucket_allocation_failures' | 'mbaf' | 'modelBucketAllocationFailures' | 'model.by_fields' | 'mbf' | 'modelByFields' | 'model.bytes' | 'mb' | 'modelBytes' | 'model.bytes_exceeded' | 'mbe' | 'modelBytesExceeded' | 'model.categorization_status' | 'mcs' | 'modelCategorizationStatus' | 'model.categorized_doc_count' | 'mcdc' | 'modelCategorizedDocCount' | 'model.dead_category_count' | 'mdcc' | 'modelDeadCategoryCount' | 'model.failed_category_count' | 'mdcc' | 'modelFailedCategoryCount' | 'model.frequent_category_count' | 'mfcc' | 'modelFrequentCategoryCount' | 'model.log_time' | 'mlt' | 'modelLogTime' | 'model.memory_limit' | 'mml' | 'modelMemoryLimit' | 'model.memory_status' | 'mms' | 'modelMemoryStatus' | 'model.over_fields' | 'mof' | 'modelOverFields' | 'model.partition_fields' | 'mpf' | 'modelPartitionFields' | 'model.rare_category_count' | 'mrcc' | 'modelRareCategoryCount' | 'model.timestamp' | 'mt' | 'modelTimestamp' | 'model.total_category_count' | 'mtcc' | 'modelTotalCategoryCount' | 'node.address' | 'na' | 'nodeAddress' | 'node.ephemeral_id' | 'ne' | 'nodeEphemeralId' | 'node.id' | 'ni' | 'nodeId' | 'node.name' | 'nn' | 'nodeName' | 'opened_time' | 'ot' | 'state' | 's';
export type CatCatAnonalyDetectorColumns = CatCatAnomalyDetectorColumn | CatCatAnomalyDetectorColumn[];
export type CatCatDatafeedColumn = 'ae' | 'assignment_explanation' | 'bc' | 'buckets.count' | 'bucketsCount' | 'id' | 'na' | 'node.address' | 'nodeAddress' | 'ne' | 'node.ephemeral_id' | 'nodeEphemeralId' | 'ni' | 'node.id' | 'nodeId' | 'nn' | 'node.name' | 'nodeName' | 'sba' | 'search.bucket_avg' | 'searchBucketAvg' | 'sc' | 'search.count' | 'searchCount' | 'seah' | 'search.exp_avg_hour' | 'searchExpAvgHour' | 'st' | 'search.time' | 'searchTime' | 's' | 'state';
export type CatCatDatafeedColumns = CatCatDatafeedColumn | CatCatDatafeedColumn[];
export type CatCatDfaColumn = 'assignment_explanation' | 'ae' | 'create_time' | 'ct' | 'createTime' | 'description' | 'd' | 'dest_index' | 'di' | 'destIndex' | 'failure_reason' | 'fr' | 'failureReason' | 'id' | 'model_memory_limit' | 'mml' | 'modelMemoryLimit' | 'node.address' | 'na' | 'nodeAddress' | 'node.ephemeral_id' | 'ne' | 'nodeEphemeralId' | 'node.id' | 'ni' | 'nodeId' | 'node.name' | 'nn' | 'nodeName' | 'progress' | 'p' | 'source_index' | 'si' | 'sourceIndex' | 'state' | 's' | 'type' | 't' | 'version' | 'v';
export type CatCatDfaColumns = CatCatDfaColumn | CatCatDfaColumn[];
export interface CatCatRequestBase extends RequestBase, SpecUtilsCommonCatQueryParameters {
}
export type CatCatTrainedModelsColumn = 'create_time' | 'ct' | 'created_by' | 'c' | 'createdBy' | 'data_frame_analytics_id' | 'df' | 'dataFrameAnalytics' | 'dfid' | 'description' | 'd' | 'heap_size' | 'hs' | 'modelHeapSize' | 'id' | 'ingest.count' | 'ic' | 'ingestCount' | 'ingest.current' | 'icurr' | 'ingestCurrent' | 'ingest.failed' | 'if' | 'ingestFailed' | 'ingest.pipelines' | 'ip' | 'ingestPipelines' | 'ingest.time' | 'it' | 'ingestTime' | 'license' | 'l' | 'operations' | 'o' | 'modelOperations' | 'version' | 'v';
export type CatCatTrainedModelsColumns = CatCatTrainedModelsColumn | CatCatTrainedModelsColumn[];
export type CatCatTransformColumn = 'changes_last_detection_time' | 'cldt' | 'checkpoint' | 'cp' | 'checkpoint_duration_time_exp_avg' | 'cdtea' | 'checkpointTimeExpAvg' | 'checkpoint_progress' | 'c' | 'checkpointProgress' | 'create_time' | 'ct' | 'createTime' | 'delete_time' | 'dtime' | 'description' | 'd' | 'dest_index' | 'di' | 'destIndex' | 'documents_deleted' | 'docd' | 'documents_indexed' | 'doci' | 'docs_per_second' | 'dps' | 'documents_processed' | 'docp' | 'frequency' | 'f' | 'id' | 'index_failure' | 'if' | 'index_time' | 'itime' | 'index_total' | 'it' | 'indexed_documents_exp_avg' | 'idea' | 'last_search_time' | 'lst' | 'lastSearchTime' | 'max_page_search_size' | 'mpsz' | 'pages_processed' | 'pp' | 'pipeline' | 'p' | 'processed_documents_exp_avg' | 'pdea' | 'processing_time' | 'pt' | 'reason' | 'r' | 'search_failure' | 'sf' | 'search_time' | 'stime' | 'search_total' | 'st' | 'source_index' | 'si' | 'sourceIndex' | 'state' | 's' | 'transform_type' | 'tt' | 'trigger_count' | 'tc' | 'version' | 'v';
export type CatCatTransformColumns = CatCatTransformColumn | CatCatTransformColumn[];
export interface CatAliasesAliasesRecord {
    alias?: string;
    a?: string;
    index?: IndexName;
    i?: IndexName;
    idx?: IndexName;
    filter?: string;
    f?: string;
    fi?: string;
    'routing.index'?: string;
    ri?: string;
    routingIndex?: string;
    'routing.search'?: string;
    rs?: string;
    routingSearch?: string;
    is_write_index?: string;
    w?: string;
    isWriteIndex?: string;
}
export interface CatAliasesRequest extends CatCatRequestBase {
    name?: Names;
    expand_wildcards?: ExpandWildcards;
}
export type CatAliasesResponse = CatAliasesAliasesRecord[];
export interface CatAllocationAllocationRecord {
    shards: string;
    s: string;
    'shards.undesired': string | null;
    'write_load.forecast': double | null;
    wlf: double | null;
    writeLoadForecast: double | null;
    'disk.indices.forecast': ByteSize | null;
    dif: ByteSize | null;
    diskIndicesForecast: ByteSize | null;
    'disk.indices': ByteSize | null;
    di: ByteSize | null;
    diskIndices: ByteSize | null;
    'disk.used': ByteSize | null;
    du: ByteSize | null;
    diskUsed: ByteSize | null;
    'disk.avail': ByteSize | null;
    da: ByteSize | null;
    diskAvail: ByteSize | null;
    'disk.total': ByteSize | null;
    dt: ByteSize | null;
    diskTotal: ByteSize | null;
    'disk.percent': Percentage | null;
    dp: Percentage | null;
    diskPercent: Percentage | null;
    host: Host | null;
    h: Host | null;
    ip: Ip | null;
    node: string;
    n: string;
    'node.role': string | null;
    r: string | null;
    role: string | null;
    nodeRole: string | null;
}
export interface CatAllocationRequest extends CatCatRequestBase {
    node_id?: NodeIds;
    bytes?: Bytes;
}
export type CatAllocationResponse = CatAllocationAllocationRecord[];
export interface CatComponentTemplatesComponentTemplate {
    name: string;
    version: string;
    alias_count: string;
    mapping_count: string;
    settings_count: string;
    metadata_count: string;
    included_in: string;
}
export interface CatComponentTemplatesRequest extends CatCatRequestBase {
    name?: string;
}
export type CatComponentTemplatesResponse = CatComponentTemplatesComponentTemplate[];
export interface CatCountCountRecord {
    epoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    t?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    time?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    timestamp?: TimeOfDay;
    ts?: TimeOfDay;
    hms?: TimeOfDay;
    hhmmss?: TimeOfDay;
    count?: string;
    dc?: string;
    'docs.count'?: string;
    docsCount?: string;
}
export interface CatCountRequest extends CatCatRequestBase {
    index?: Indices;
}
export type CatCountResponse = CatCountCountRecord[];
export interface CatFielddataFielddataRecord {
    id?: string;
    host?: string;
    h?: string;
    ip?: string;
    node?: string;
    n?: string;
    field?: string;
    f?: string;
    size?: string;
}
export interface CatFielddataRequest extends CatCatRequestBase {
    fields?: Fields;
    bytes?: Bytes;
}
export type CatFielddataResponse = CatFielddataFielddataRecord[];
export interface CatHealthHealthRecord {
    epoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    time?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    timestamp?: TimeOfDay;
    ts?: TimeOfDay;
    hms?: TimeOfDay;
    hhmmss?: TimeOfDay;
    cluster?: string;
    cl?: string;
    status?: string;
    st?: string;
    'node.total'?: string;
    nt?: string;
    nodeTotal?: string;
    'node.data'?: string;
    nd?: string;
    nodeData?: string;
    shards?: string;
    t?: string;
    sh?: string;
    'shards.total'?: string;
    shardsTotal?: string;
    pri?: string;
    p?: string;
    'shards.primary'?: string;
    shardsPrimary?: string;
    relo?: string;
    r?: string;
    'shards.relocating'?: string;
    shardsRelocating?: string;
    init?: string;
    i?: string;
    'shards.initializing'?: string;
    shardsInitializing?: string;
    unassign?: string;
    u?: string;
    'shards.unassigned'?: string;
    shardsUnassigned?: string;
    pending_tasks?: string;
    pt?: string;
    pendingTasks?: string;
    max_task_wait_time?: string;
    mtwt?: string;
    maxTaskWaitTime?: string;
    active_shards_percent?: string;
    asp?: string;
    activeShardsPercent?: string;
}
export interface CatHealthRequest extends CatCatRequestBase {
    time?: TimeUnit;
    ts?: boolean;
}
export type CatHealthResponse = CatHealthHealthRecord[];
export interface CatHelpHelpRecord {
    endpoint: string;
}
export interface CatHelpRequest extends CatCatRequestBase {
}
export type CatHelpResponse = CatHelpHelpRecord[];
export interface CatIndicesIndicesRecord {
    health?: string;
    h?: string;
    status?: string;
    s?: string;
    index?: string;
    i?: string;
    idx?: string;
    uuid?: string;
    id?: string;
    pri?: string;
    p?: string;
    'shards.primary'?: string;
    shardsPrimary?: string;
    rep?: string;
    r?: string;
    'shards.replica'?: string;
    shardsReplica?: string;
    'docs.count'?: string | null;
    dc?: string | null;
    docsCount?: string | null;
    'docs.deleted'?: string | null;
    dd?: string | null;
    docsDeleted?: string | null;
    'creation.date'?: string;
    cd?: string;
    'creation.date.string'?: string;
    cds?: string;
    'store.size'?: string | null;
    ss?: string | null;
    storeSize?: string | null;
    'pri.store.size'?: string | null;
    'completion.size'?: string;
    cs?: string;
    completionSize?: string;
    'pri.completion.size'?: string;
    'fielddata.memory_size'?: string;
    fm?: string;
    fielddataMemory?: string;
    'pri.fielddata.memory_size'?: string;
    'fielddata.evictions'?: string;
    fe?: string;
    fielddataEvictions?: string;
    'pri.fielddata.evictions'?: string;
    'query_cache.memory_size'?: string;
    qcm?: string;
    queryCacheMemory?: string;
    'pri.query_cache.memory_size'?: string;
    'query_cache.evictions'?: string;
    qce?: string;
    queryCacheEvictions?: string;
    'pri.query_cache.evictions'?: string;
    'request_cache.memory_size'?: string;
    rcm?: string;
    requestCacheMemory?: string;
    'pri.request_cache.memory_size'?: string;
    'request_cache.evictions'?: string;
    rce?: string;
    requestCacheEvictions?: string;
    'pri.request_cache.evictions'?: string;
    'request_cache.hit_count'?: string;
    rchc?: string;
    requestCacheHitCount?: string;
    'pri.request_cache.hit_count'?: string;
    'request_cache.miss_count'?: string;
    rcmc?: string;
    requestCacheMissCount?: string;
    'pri.request_cache.miss_count'?: string;
    'flush.total'?: string;
    ft?: string;
    flushTotal?: string;
    'pri.flush.total'?: string;
    'flush.total_time'?: string;
    ftt?: string;
    flushTotalTime?: string;
    'pri.flush.total_time'?: string;
    'get.current'?: string;
    gc?: string;
    getCurrent?: string;
    'pri.get.current'?: string;
    'get.time'?: string;
    gti?: string;
    getTime?: string;
    'pri.get.time'?: string;
    'get.total'?: string;
    gto?: string;
    getTotal?: string;
    'pri.get.total'?: string;
    'get.exists_time'?: string;
    geti?: string;
    getExistsTime?: string;
    'pri.get.exists_time'?: string;
    'get.exists_total'?: string;
    geto?: string;
    getExistsTotal?: string;
    'pri.get.exists_total'?: string;
    'get.missing_time'?: string;
    gmti?: string;
    getMissingTime?: string;
    'pri.get.missing_time'?: string;
    'get.missing_total'?: string;
    gmto?: string;
    getMissingTotal?: string;
    'pri.get.missing_total'?: string;
    'indexing.delete_current'?: string;
    idc?: string;
    indexingDeleteCurrent?: string;
    'pri.indexing.delete_current'?: string;
    'indexing.delete_time'?: string;
    idti?: string;
    indexingDeleteTime?: string;
    'pri.indexing.delete_time'?: string;
    'indexing.delete_total'?: string;
    idto?: string;
    indexingDeleteTotal?: string;
    'pri.indexing.delete_total'?: string;
    'indexing.index_current'?: string;
    iic?: string;
    indexingIndexCurrent?: string;
    'pri.indexing.index_current'?: string;
    'indexing.index_time'?: string;
    iiti?: string;
    indexingIndexTime?: string;
    'pri.indexing.index_time'?: string;
    'indexing.index_total'?: string;
    iito?: string;
    indexingIndexTotal?: string;
    'pri.indexing.index_total'?: string;
    'indexing.index_failed'?: string;
    iif?: string;
    indexingIndexFailed?: string;
    'pri.indexing.index_failed'?: string;
    'merges.current'?: string;
    mc?: string;
    mergesCurrent?: string;
    'pri.merges.current'?: string;
    'merges.current_docs'?: string;
    mcd?: string;
    mergesCurrentDocs?: string;
    'pri.merges.current_docs'?: string;
    'merges.current_size'?: string;
    mcs?: string;
    mergesCurrentSize?: string;
    'pri.merges.current_size'?: string;
    'merges.total'?: string;
    mt?: string;
    mergesTotal?: string;
    'pri.merges.total'?: string;
    'merges.total_docs'?: string;
    mtd?: string;
    mergesTotalDocs?: string;
    'pri.merges.total_docs'?: string;
    'merges.total_size'?: string;
    mts?: string;
    mergesTotalSize?: string;
    'pri.merges.total_size'?: string;
    'merges.total_time'?: string;
    mtt?: string;
    mergesTotalTime?: string;
    'pri.merges.total_time'?: string;
    'refresh.total'?: string;
    rto?: string;
    refreshTotal?: string;
    'pri.refresh.total'?: string;
    'refresh.time'?: string;
    rti?: string;
    refreshTime?: string;
    'pri.refresh.time'?: string;
    'refresh.external_total'?: string;
    reto?: string;
    'pri.refresh.external_total'?: string;
    'refresh.external_time'?: string;
    reti?: string;
    'pri.refresh.external_time'?: string;
    'refresh.listeners'?: string;
    rli?: string;
    refreshListeners?: string;
    'pri.refresh.listeners'?: string;
    'search.fetch_current'?: string;
    sfc?: string;
    searchFetchCurrent?: string;
    'pri.search.fetch_current'?: string;
    'search.fetch_time'?: string;
    sfti?: string;
    searchFetchTime?: string;
    'pri.search.fetch_time'?: string;
    'search.fetch_total'?: string;
    sfto?: string;
    searchFetchTotal?: string;
    'pri.search.fetch_total'?: string;
    'search.open_contexts'?: string;
    so?: string;
    searchOpenContexts?: string;
    'pri.search.open_contexts'?: string;
    'search.query_current'?: string;
    sqc?: string;
    searchQueryCurrent?: string;
    'pri.search.query_current'?: string;
    'search.query_time'?: string;
    sqti?: string;
    searchQueryTime?: string;
    'pri.search.query_time'?: string;
    'search.query_total'?: string;
    sqto?: string;
    searchQueryTotal?: string;
    'pri.search.query_total'?: string;
    'search.scroll_current'?: string;
    scc?: string;
    searchScrollCurrent?: string;
    'pri.search.scroll_current'?: string;
    'search.scroll_time'?: string;
    scti?: string;
    searchScrollTime?: string;
    'pri.search.scroll_time'?: string;
    'search.scroll_total'?: string;
    scto?: string;
    searchScrollTotal?: string;
    'pri.search.scroll_total'?: string;
    'segments.count'?: string;
    sc?: string;
    segmentsCount?: string;
    'pri.segments.count'?: string;
    'segments.memory'?: string;
    sm?: string;
    segmentsMemory?: string;
    'pri.segments.memory'?: string;
    'segments.index_writer_memory'?: string;
    siwm?: string;
    segmentsIndexWriterMemory?: string;
    'pri.segments.index_writer_memory'?: string;
    'segments.version_map_memory'?: string;
    svmm?: string;
    segmentsVersionMapMemory?: string;
    'pri.segments.version_map_memory'?: string;
    'segments.fixed_bitset_memory'?: string;
    sfbm?: string;
    fixedBitsetMemory?: string;
    'pri.segments.fixed_bitset_memory'?: string;
    'warmer.current'?: string;
    wc?: string;
    warmerCurrent?: string;
    'pri.warmer.current'?: string;
    'warmer.total'?: string;
    wto?: string;
    warmerTotal?: string;
    'pri.warmer.total'?: string;
    'warmer.total_time'?: string;
    wtt?: string;
    warmerTotalTime?: string;
    'pri.warmer.total_time'?: string;
    'suggest.current'?: string;
    suc?: string;
    suggestCurrent?: string;
    'pri.suggest.current'?: string;
    'suggest.time'?: string;
    suti?: string;
    suggestTime?: string;
    'pri.suggest.time'?: string;
    'suggest.total'?: string;
    suto?: string;
    suggestTotal?: string;
    'pri.suggest.total'?: string;
    'memory.total'?: string;
    tm?: string;
    memoryTotal?: string;
    'pri.memory.total'?: string;
    'search.throttled'?: string;
    sth?: string;
    'bulk.total_operations'?: string;
    bto?: string;
    bulkTotalOperation?: string;
    'pri.bulk.total_operations'?: string;
    'bulk.total_time'?: string;
    btti?: string;
    bulkTotalTime?: string;
    'pri.bulk.total_time'?: string;
    'bulk.total_size_in_bytes'?: string;
    btsi?: string;
    bulkTotalSizeInBytes?: string;
    'pri.bulk.total_size_in_bytes'?: string;
    'bulk.avg_time'?: string;
    bati?: string;
    bulkAvgTime?: string;
    'pri.bulk.avg_time'?: string;
    'bulk.avg_size_in_bytes'?: string;
    basi?: string;
    bulkAvgSizeInBytes?: string;
    'pri.bulk.avg_size_in_bytes'?: string;
}
export interface CatIndicesRequest extends CatCatRequestBase {
    index?: Indices;
    bytes?: Bytes;
    expand_wildcards?: ExpandWildcards;
    health?: HealthStatus;
    include_unloaded_segments?: boolean;
    pri?: boolean;
    time?: TimeUnit;
}
export type CatIndicesResponse = CatIndicesIndicesRecord[];
export interface CatMasterMasterRecord {
    id?: string;
    host?: string;
    h?: string;
    ip?: string;
    node?: string;
    n?: string;
}
export interface CatMasterRequest extends CatCatRequestBase {
}
export type CatMasterResponse = CatMasterMasterRecord[];
export interface CatMlDataFrameAnalyticsDataFrameAnalyticsRecord {
    id?: Id;
    type?: string;
    t?: string;
    create_time?: string;
    ct?: string;
    createTime?: string;
    version?: VersionString;
    v?: VersionString;
    source_index?: IndexName;
    si?: IndexName;
    sourceIndex?: IndexName;
    dest_index?: IndexName;
    di?: IndexName;
    destIndex?: IndexName;
    description?: string;
    d?: string;
    model_memory_limit?: string;
    mml?: string;
    modelMemoryLimit?: string;
    state?: string;
    s?: string;
    failure_reason?: string;
    fr?: string;
    failureReason?: string;
    progress?: string;
    p?: string;
    assignment_explanation?: string;
    ae?: string;
    assignmentExplanation?: string;
    'node.id'?: Id;
    ni?: Id;
    nodeId?: Id;
    'node.name'?: Name;
    nn?: Name;
    nodeName?: Name;
    'node.ephemeral_id'?: Id;
    ne?: Id;
    nodeEphemeralId?: Id;
    'node.address'?: string;
    na?: string;
    nodeAddress?: string;
}
export interface CatMlDataFrameAnalyticsRequest extends CatCatRequestBase {
    id?: Id;
    allow_no_match?: boolean;
    bytes?: Bytes;
    h?: CatCatDfaColumns;
    s?: CatCatDfaColumns;
    time?: Duration;
}
export type CatMlDataFrameAnalyticsResponse = CatMlDataFrameAnalyticsDataFrameAnalyticsRecord[];
export interface CatMlDatafeedsDatafeedsRecord {
    id?: string;
    state?: MlDatafeedState;
    s?: MlDatafeedState;
    assignment_explanation?: string;
    ae?: string;
    'buckets.count'?: string;
    bc?: string;
    bucketsCount?: string;
    'search.count'?: string;
    sc?: string;
    searchCount?: string;
    'search.time'?: string;
    st?: string;
    searchTime?: string;
    'search.bucket_avg'?: string;
    sba?: string;
    searchBucketAvg?: string;
    'search.exp_avg_hour'?: string;
    seah?: string;
    searchExpAvgHour?: string;
    'node.id'?: string;
    ni?: string;
    nodeId?: string;
    'node.name'?: string;
    nn?: string;
    nodeName?: string;
    'node.ephemeral_id'?: string;
    ne?: string;
    nodeEphemeralId?: string;
    'node.address'?: string;
    na?: string;
    nodeAddress?: string;
}
export interface CatMlDatafeedsRequest extends CatCatRequestBase {
    datafeed_id?: Id;
    allow_no_match?: boolean;
    h?: CatCatDatafeedColumns;
    s?: CatCatDatafeedColumns;
    time?: TimeUnit;
}
export type CatMlDatafeedsResponse = CatMlDatafeedsDatafeedsRecord[];
export interface CatMlJobsJobsRecord {
    id?: Id;
    state?: MlJobState;
    s?: MlJobState;
    opened_time?: string;
    ot?: string;
    assignment_explanation?: string;
    ae?: string;
    'data.processed_records'?: string;
    dpr?: string;
    dataProcessedRecords?: string;
    'data.processed_fields'?: string;
    dpf?: string;
    dataProcessedFields?: string;
    'data.input_bytes'?: ByteSize;
    dib?: ByteSize;
    dataInputBytes?: ByteSize;
    'data.input_records'?: string;
    dir?: string;
    dataInputRecords?: string;
    'data.input_fields'?: string;
    dif?: string;
    dataInputFields?: string;
    'data.invalid_dates'?: string;
    did?: string;
    dataInvalidDates?: string;
    'data.missing_fields'?: string;
    dmf?: string;
    dataMissingFields?: string;
    'data.out_of_order_timestamps'?: string;
    doot?: string;
    dataOutOfOrderTimestamps?: string;
    'data.empty_buckets'?: string;
    deb?: string;
    dataEmptyBuckets?: string;
    'data.sparse_buckets'?: string;
    dsb?: string;
    dataSparseBuckets?: string;
    'data.buckets'?: string;
    db?: string;
    dataBuckets?: string;
    'data.earliest_record'?: string;
    der?: string;
    dataEarliestRecord?: string;
    'data.latest_record'?: string;
    dlr?: string;
    dataLatestRecord?: string;
    'data.last'?: string;
    dl?: string;
    dataLast?: string;
    'data.last_empty_bucket'?: string;
    dleb?: string;
    dataLastEmptyBucket?: string;
    'data.last_sparse_bucket'?: string;
    dlsb?: string;
    dataLastSparseBucket?: string;
    'model.bytes'?: ByteSize;
    mb?: ByteSize;
    modelBytes?: ByteSize;
    'model.memory_status'?: MlMemoryStatus;
    mms?: MlMemoryStatus;
    modelMemoryStatus?: MlMemoryStatus;
    'model.bytes_exceeded'?: ByteSize;
    mbe?: ByteSize;
    modelBytesExceeded?: ByteSize;
    'model.memory_limit'?: string;
    mml?: string;
    modelMemoryLimit?: string;
    'model.by_fields'?: string;
    mbf?: string;
    modelByFields?: string;
    'model.over_fields'?: string;
    mof?: string;
    modelOverFields?: string;
    'model.partition_fields'?: string;
    mpf?: string;
    modelPartitionFields?: string;
    'model.bucket_allocation_failures'?: string;
    mbaf?: string;
    modelBucketAllocationFailures?: string;
    'model.categorization_status'?: MlCategorizationStatus;
    mcs?: MlCategorizationStatus;
    modelCategorizationStatus?: MlCategorizationStatus;
    'model.categorized_doc_count'?: string;
    mcdc?: string;
    modelCategorizedDocCount?: string;
    'model.total_category_count'?: string;
    mtcc?: string;
    modelTotalCategoryCount?: string;
    'model.frequent_category_count'?: string;
    modelFrequentCategoryCount?: string;
    'model.rare_category_count'?: string;
    mrcc?: string;
    modelRareCategoryCount?: string;
    'model.dead_category_count'?: string;
    mdcc?: string;
    modelDeadCategoryCount?: string;
    'model.failed_category_count'?: string;
    mfcc?: string;
    modelFailedCategoryCount?: string;
    'model.log_time'?: string;
    mlt?: string;
    modelLogTime?: string;
    'model.timestamp'?: string;
    mt?: string;
    modelTimestamp?: string;
    'forecasts.total'?: string;
    ft?: string;
    forecastsTotal?: string;
    'forecasts.memory.min'?: string;
    fmmin?: string;
    forecastsMemoryMin?: string;
    'forecasts.memory.max'?: string;
    fmmax?: string;
    forecastsMemoryMax?: string;
    'forecasts.memory.avg'?: string;
    fmavg?: string;
    forecastsMemoryAvg?: string;
    'forecasts.memory.total'?: string;
    fmt?: string;
    forecastsMemoryTotal?: string;
    'forecasts.records.min'?: string;
    frmin?: string;
    forecastsRecordsMin?: string;
    'forecasts.records.max'?: string;
    frmax?: string;
    forecastsRecordsMax?: string;
    'forecasts.records.avg'?: string;
    fravg?: string;
    forecastsRecordsAvg?: string;
    'forecasts.records.total'?: string;
    frt?: string;
    forecastsRecordsTotal?: string;
    'forecasts.time.min'?: string;
    ftmin?: string;
    forecastsTimeMin?: string;
    'forecasts.time.max'?: string;
    ftmax?: string;
    forecastsTimeMax?: string;
    'forecasts.time.avg'?: string;
    ftavg?: string;
    forecastsTimeAvg?: string;
    'forecasts.time.total'?: string;
    ftt?: string;
    forecastsTimeTotal?: string;
    'node.id'?: NodeId;
    ni?: NodeId;
    nodeId?: NodeId;
    'node.name'?: string;
    nn?: string;
    nodeName?: string;
    'node.ephemeral_id'?: NodeId;
    ne?: NodeId;
    nodeEphemeralId?: NodeId;
    'node.address'?: string;
    na?: string;
    nodeAddress?: string;
    'buckets.count'?: string;
    bc?: string;
    bucketsCount?: string;
    'buckets.time.total'?: string;
    btt?: string;
    bucketsTimeTotal?: string;
    'buckets.time.min'?: string;
    btmin?: string;
    bucketsTimeMin?: string;
    'buckets.time.max'?: string;
    btmax?: string;
    bucketsTimeMax?: string;
    'buckets.time.exp_avg'?: string;
    btea?: string;
    bucketsTimeExpAvg?: string;
    'buckets.time.exp_avg_hour'?: string;
    bteah?: string;
    bucketsTimeExpAvgHour?: string;
}
export interface CatMlJobsRequest extends CatCatRequestBase {
    job_id?: Id;
    allow_no_match?: boolean;
    bytes?: Bytes;
    h?: CatCatAnonalyDetectorColumns;
    s?: CatCatAnonalyDetectorColumns;
    time?: TimeUnit;
}
export type CatMlJobsResponse = CatMlJobsJobsRecord[];
export interface CatMlTrainedModelsRequest extends CatCatRequestBase {
    model_id?: Id;
    allow_no_match?: boolean;
    bytes?: Bytes;
    h?: CatCatTrainedModelsColumns;
    s?: CatCatTrainedModelsColumns;
    from?: integer;
    size?: integer;
}
export type CatMlTrainedModelsResponse = CatMlTrainedModelsTrainedModelsRecord[];
export interface CatMlTrainedModelsTrainedModelsRecord {
    id?: Id;
    created_by?: string;
    c?: string;
    createdBy?: string;
    heap_size?: ByteSize;
    hs?: ByteSize;
    modelHeapSize?: ByteSize;
    operations?: string;
    o?: string;
    modelOperations?: string;
    license?: string;
    l?: string;
    create_time?: DateTime;
    ct?: DateTime;
    version?: VersionString;
    v?: VersionString;
    description?: string;
    d?: string;
    'ingest.pipelines'?: string;
    ip?: string;
    ingestPipelines?: string;
    'ingest.count'?: string;
    ic?: string;
    ingestCount?: string;
    'ingest.time'?: string;
    it?: string;
    ingestTime?: string;
    'ingest.current'?: string;
    icurr?: string;
    ingestCurrent?: string;
    'ingest.failed'?: string;
    if?: string;
    ingestFailed?: string;
    'data_frame.id'?: string;
    dfid?: string;
    dataFrameAnalytics?: string;
    'data_frame.create_time'?: string;
    dft?: string;
    dataFrameAnalyticsTime?: string;
    'data_frame.source_index'?: string;
    dfsi?: string;
    dataFrameAnalyticsSrcIndex?: string;
    'data_frame.analysis'?: string;
    dfa?: string;
    dataFrameAnalyticsAnalysis?: string;
    type?: string;
}
export interface CatNodeattrsNodeAttributesRecord {
    node?: string;
    id?: string;
    pid?: string;
    host?: string;
    h?: string;
    ip?: string;
    i?: string;
    port?: string;
    attr?: string;
    value?: string;
}
export interface CatNodeattrsRequest extends CatCatRequestBase {
}
export type CatNodeattrsResponse = CatNodeattrsNodeAttributesRecord[];
export interface CatNodesNodesRecord {
    id?: Id;
    nodeId?: Id;
    pid?: string;
    p?: string;
    ip?: string;
    i?: string;
    port?: string;
    po?: string;
    http_address?: string;
    http?: string;
    version?: VersionString;
    v?: VersionString;
    flavor?: string;
    f?: string;
    type?: string;
    t?: string;
    build?: string;
    b?: string;
    jdk?: string;
    j?: string;
    'disk.total'?: ByteSize;
    dt?: ByteSize;
    diskTotal?: ByteSize;
    'disk.used'?: ByteSize;
    du?: ByteSize;
    diskUsed?: ByteSize;
    'disk.avail'?: ByteSize;
    d?: ByteSize;
    da?: ByteSize;
    disk?: ByteSize;
    diskAvail?: ByteSize;
    'disk.used_percent'?: Percentage;
    dup?: Percentage;
    diskUsedPercent?: Percentage;
    'heap.current'?: string;
    hc?: string;
    heapCurrent?: string;
    'heap.percent'?: Percentage;
    hp?: Percentage;
    heapPercent?: Percentage;
    'heap.max'?: string;
    hm?: string;
    heapMax?: string;
    'ram.current'?: string;
    rc?: string;
    ramCurrent?: string;
    'ram.percent'?: Percentage;
    rp?: Percentage;
    ramPercent?: Percentage;
    'ram.max'?: string;
    rn?: string;
    ramMax?: string;
    'file_desc.current'?: string;
    fdc?: string;
    fileDescriptorCurrent?: string;
    'file_desc.percent'?: Percentage;
    fdp?: Percentage;
    fileDescriptorPercent?: Percentage;
    'file_desc.max'?: string;
    fdm?: string;
    fileDescriptorMax?: string;
    cpu?: string;
    load_1m?: string;
    load_5m?: string;
    load_15m?: string;
    l?: string;
    uptime?: string;
    u?: string;
    'node.role'?: string;
    r?: string;
    role?: string;
    nodeRole?: string;
    master?: string;
    m?: string;
    name?: Name;
    n?: Name;
    'completion.size'?: string;
    cs?: string;
    completionSize?: string;
    'fielddata.memory_size'?: string;
    fm?: string;
    fielddataMemory?: string;
    'fielddata.evictions'?: string;
    fe?: string;
    fielddataEvictions?: string;
    'query_cache.memory_size'?: string;
    qcm?: string;
    queryCacheMemory?: string;
    'query_cache.evictions'?: string;
    qce?: string;
    queryCacheEvictions?: string;
    'query_cache.hit_count'?: string;
    qchc?: string;
    queryCacheHitCount?: string;
    'query_cache.miss_count'?: string;
    qcmc?: string;
    queryCacheMissCount?: string;
    'request_cache.memory_size'?: string;
    rcm?: string;
    requestCacheMemory?: string;
    'request_cache.evictions'?: string;
    rce?: string;
    requestCacheEvictions?: string;
    'request_cache.hit_count'?: string;
    rchc?: string;
    requestCacheHitCount?: string;
    'request_cache.miss_count'?: string;
    rcmc?: string;
    requestCacheMissCount?: string;
    'flush.total'?: string;
    ft?: string;
    flushTotal?: string;
    'flush.total_time'?: string;
    ftt?: string;
    flushTotalTime?: string;
    'get.current'?: string;
    gc?: string;
    getCurrent?: string;
    'get.time'?: string;
    gti?: string;
    getTime?: string;
    'get.total'?: string;
    gto?: string;
    getTotal?: string;
    'get.exists_time'?: string;
    geti?: string;
    getExistsTime?: string;
    'get.exists_total'?: string;
    geto?: string;
    getExistsTotal?: string;
    'get.missing_time'?: string;
    gmti?: string;
    getMissingTime?: string;
    'get.missing_total'?: string;
    gmto?: string;
    getMissingTotal?: string;
    'indexing.delete_current'?: string;
    idc?: string;
    indexingDeleteCurrent?: string;
    'indexing.delete_time'?: string;
    idti?: string;
    indexingDeleteTime?: string;
    'indexing.delete_total'?: string;
    idto?: string;
    indexingDeleteTotal?: string;
    'indexing.index_current'?: string;
    iic?: string;
    indexingIndexCurrent?: string;
    'indexing.index_time'?: string;
    iiti?: string;
    indexingIndexTime?: string;
    'indexing.index_total'?: string;
    iito?: string;
    indexingIndexTotal?: string;
    'indexing.index_failed'?: string;
    iif?: string;
    indexingIndexFailed?: string;
    'merges.current'?: string;
    mc?: string;
    mergesCurrent?: string;
    'merges.current_docs'?: string;
    mcd?: string;
    mergesCurrentDocs?: string;
    'merges.current_size'?: string;
    mcs?: string;
    mergesCurrentSize?: string;
    'merges.total'?: string;
    mt?: string;
    mergesTotal?: string;
    'merges.total_docs'?: string;
    mtd?: string;
    mergesTotalDocs?: string;
    'merges.total_size'?: string;
    mts?: string;
    mergesTotalSize?: string;
    'merges.total_time'?: string;
    mtt?: string;
    mergesTotalTime?: string;
    'refresh.total'?: string;
    'refresh.time'?: string;
    'refresh.external_total'?: string;
    rto?: string;
    refreshTotal?: string;
    'refresh.external_time'?: string;
    rti?: string;
    refreshTime?: string;
    'refresh.listeners'?: string;
    rli?: string;
    refreshListeners?: string;
    'script.compilations'?: string;
    scrcc?: string;
    scriptCompilations?: string;
    'script.cache_evictions'?: string;
    scrce?: string;
    scriptCacheEvictions?: string;
    'script.compilation_limit_triggered'?: string;
    scrclt?: string;
    scriptCacheCompilationLimitTriggered?: string;
    'search.fetch_current'?: string;
    sfc?: string;
    searchFetchCurrent?: string;
    'search.fetch_time'?: string;
    sfti?: string;
    searchFetchTime?: string;
    'search.fetch_total'?: string;
    sfto?: string;
    searchFetchTotal?: string;
    'search.open_contexts'?: string;
    so?: string;
    searchOpenContexts?: string;
    'search.query_current'?: string;
    sqc?: string;
    searchQueryCurrent?: string;
    'search.query_time'?: string;
    sqti?: string;
    searchQueryTime?: string;
    'search.query_total'?: string;
    sqto?: string;
    searchQueryTotal?: string;
    'search.scroll_current'?: string;
    scc?: string;
    searchScrollCurrent?: string;
    'search.scroll_time'?: string;
    scti?: string;
    searchScrollTime?: string;
    'search.scroll_total'?: string;
    scto?: string;
    searchScrollTotal?: string;
    'segments.count'?: string;
    sc?: string;
    segmentsCount?: string;
    'segments.memory'?: string;
    sm?: string;
    segmentsMemory?: string;
    'segments.index_writer_memory'?: string;
    siwm?: string;
    segmentsIndexWriterMemory?: string;
    'segments.version_map_memory'?: string;
    svmm?: string;
    segmentsVersionMapMemory?: string;
    'segments.fixed_bitset_memory'?: string;
    sfbm?: string;
    fixedBitsetMemory?: string;
    'suggest.current'?: string;
    suc?: string;
    suggestCurrent?: string;
    'suggest.time'?: string;
    suti?: string;
    suggestTime?: string;
    'suggest.total'?: string;
    suto?: string;
    suggestTotal?: string;
    'bulk.total_operations'?: string;
    bto?: string;
    bulkTotalOperations?: string;
    'bulk.total_time'?: string;
    btti?: string;
    bulkTotalTime?: string;
    'bulk.total_size_in_bytes'?: string;
    btsi?: string;
    bulkTotalSizeInBytes?: string;
    'bulk.avg_time'?: string;
    bati?: string;
    bulkAvgTime?: string;
    'bulk.avg_size_in_bytes'?: string;
    basi?: string;
    bulkAvgSizeInBytes?: string;
}
export interface CatNodesRequest extends CatCatRequestBase {
    bytes?: Bytes;
    full_id?: boolean | string;
    include_unloaded_segments?: boolean;
}
export type CatNodesResponse = CatNodesNodesRecord[];
export interface CatPendingTasksPendingTasksRecord {
    insertOrder?: string;
    o?: string;
    timeInQueue?: string;
    t?: string;
    priority?: string;
    p?: string;
    source?: string;
    s?: string;
}
export interface CatPendingTasksRequest extends CatCatRequestBase {
}
export type CatPendingTasksResponse = CatPendingTasksPendingTasksRecord[];
export interface CatPluginsPluginsRecord {
    id?: NodeId;
    name?: Name;
    n?: Name;
    component?: string;
    c?: string;
    version?: VersionString;
    v?: VersionString;
    description?: string;
    d?: string;
    type?: string;
    t?: string;
}
export interface CatPluginsRequest extends CatCatRequestBase {
}
export type CatPluginsResponse = CatPluginsPluginsRecord[];
export interface CatRecoveryRecoveryRecord {
    index?: IndexName;
    i?: IndexName;
    idx?: IndexName;
    shard?: string;
    s?: string;
    sh?: string;
    start_time?: DateTime;
    start?: DateTime;
    start_time_millis?: EpochTime<UnitMillis>;
    start_millis?: EpochTime<UnitMillis>;
    stop_time?: DateTime;
    stop?: DateTime;
    stop_time_millis?: EpochTime<UnitMillis>;
    stop_millis?: EpochTime<UnitMillis>;
    time?: Duration;
    t?: Duration;
    ti?: Duration;
    type?: string;
    ty?: string;
    stage?: string;
    st?: string;
    source_host?: string;
    shost?: string;
    source_node?: string;
    snode?: string;
    target_host?: string;
    thost?: string;
    target_node?: string;
    tnode?: string;
    repository?: string;
    rep?: string;
    snapshot?: string;
    snap?: string;
    files?: string;
    f?: string;
    files_recovered?: string;
    fr?: string;
    files_percent?: Percentage;
    fp?: Percentage;
    files_total?: string;
    tf?: string;
    bytes?: string;
    b?: string;
    bytes_recovered?: string;
    br?: string;
    bytes_percent?: Percentage;
    bp?: Percentage;
    bytes_total?: string;
    tb?: string;
    translog_ops?: string;
    to?: string;
    translog_ops_recovered?: string;
    tor?: string;
    translog_ops_percent?: Percentage;
    top?: Percentage;
}
export interface CatRecoveryRequest extends CatCatRequestBase {
    index?: Indices;
    active_only?: boolean;
    bytes?: Bytes;
    detailed?: boolean;
}
export type CatRecoveryResponse = CatRecoveryRecoveryRecord[];
export interface CatRepositoriesRepositoriesRecord {
    id?: string;
    repoId?: string;
    type?: string;
    t?: string;
}
export interface CatRepositoriesRequest extends CatCatRequestBase {
}
export type CatRepositoriesResponse = CatRepositoriesRepositoriesRecord[];
export interface CatSegmentsRequest extends CatCatRequestBase {
    index?: Indices;
    bytes?: Bytes;
}
export type CatSegmentsResponse = CatSegmentsSegmentsRecord[];
export interface CatSegmentsSegmentsRecord {
    index?: IndexName;
    i?: IndexName;
    idx?: IndexName;
    shard?: string;
    s?: string;
    sh?: string;
    prirep?: string;
    p?: string;
    pr?: string;
    primaryOrReplica?: string;
    ip?: string;
    id?: NodeId;
    segment?: string;
    seg?: string;
    generation?: string;
    g?: string;
    gen?: string;
    'docs.count'?: string;
    dc?: string;
    docsCount?: string;
    'docs.deleted'?: string;
    dd?: string;
    docsDeleted?: string;
    size?: ByteSize;
    si?: ByteSize;
    'size.memory'?: ByteSize;
    sm?: ByteSize;
    sizeMemory?: ByteSize;
    committed?: string;
    ic?: string;
    isCommitted?: string;
    searchable?: string;
    is?: string;
    isSearchable?: string;
    version?: VersionString;
    v?: VersionString;
    compound?: string;
    ico?: string;
    isCompound?: string;
}
export interface CatShardsRequest extends CatCatRequestBase {
    index?: Indices;
    bytes?: Bytes;
}
export type CatShardsResponse = CatShardsShardsRecord[];
export interface CatShardsShardsRecord {
    index?: string;
    i?: string;
    idx?: string;
    shard?: string;
    s?: string;
    sh?: string;
    prirep?: string;
    p?: string;
    pr?: string;
    primaryOrReplica?: string;
    state?: string;
    st?: string;
    docs?: string | null;
    d?: string | null;
    dc?: string | null;
    store?: string | null;
    sto?: string | null;
    ip?: string | null;
    id?: string;
    node?: string | null;
    n?: string | null;
    sync_id?: string;
    'unassigned.reason'?: string;
    ur?: string;
    'unassigned.at'?: string;
    ua?: string;
    'unassigned.for'?: string;
    uf?: string;
    'unassigned.details'?: string;
    ud?: string;
    'recoverysource.type'?: string;
    rs?: string;
    'completion.size'?: string;
    cs?: string;
    completionSize?: string;
    'fielddata.memory_size'?: string;
    fm?: string;
    fielddataMemory?: string;
    'fielddata.evictions'?: string;
    fe?: string;
    fielddataEvictions?: string;
    'query_cache.memory_size'?: string;
    qcm?: string;
    queryCacheMemory?: string;
    'query_cache.evictions'?: string;
    qce?: string;
    queryCacheEvictions?: string;
    'flush.total'?: string;
    ft?: string;
    flushTotal?: string;
    'flush.total_time'?: string;
    ftt?: string;
    flushTotalTime?: string;
    'get.current'?: string;
    gc?: string;
    getCurrent?: string;
    'get.time'?: string;
    gti?: string;
    getTime?: string;
    'get.total'?: string;
    gto?: string;
    getTotal?: string;
    'get.exists_time'?: string;
    geti?: string;
    getExistsTime?: string;
    'get.exists_total'?: string;
    geto?: string;
    getExistsTotal?: string;
    'get.missing_time'?: string;
    gmti?: string;
    getMissingTime?: string;
    'get.missing_total'?: string;
    gmto?: string;
    getMissingTotal?: string;
    'indexing.delete_current'?: string;
    idc?: string;
    indexingDeleteCurrent?: string;
    'indexing.delete_time'?: string;
    idti?: string;
    indexingDeleteTime?: string;
    'indexing.delete_total'?: string;
    idto?: string;
    indexingDeleteTotal?: string;
    'indexing.index_current'?: string;
    iic?: string;
    indexingIndexCurrent?: string;
    'indexing.index_time'?: string;
    iiti?: string;
    indexingIndexTime?: string;
    'indexing.index_total'?: string;
    iito?: string;
    indexingIndexTotal?: string;
    'indexing.index_failed'?: string;
    iif?: string;
    indexingIndexFailed?: string;
    'merges.current'?: string;
    mc?: string;
    mergesCurrent?: string;
    'merges.current_docs'?: string;
    mcd?: string;
    mergesCurrentDocs?: string;
    'merges.current_size'?: string;
    mcs?: string;
    mergesCurrentSize?: string;
    'merges.total'?: string;
    mt?: string;
    mergesTotal?: string;
    'merges.total_docs'?: string;
    mtd?: string;
    mergesTotalDocs?: string;
    'merges.total_size'?: string;
    mts?: string;
    mergesTotalSize?: string;
    'merges.total_time'?: string;
    mtt?: string;
    mergesTotalTime?: string;
    'refresh.total'?: string;
    'refresh.time'?: string;
    'refresh.external_total'?: string;
    rto?: string;
    refreshTotal?: string;
    'refresh.external_time'?: string;
    rti?: string;
    refreshTime?: string;
    'refresh.listeners'?: string;
    rli?: string;
    refreshListeners?: string;
    'search.fetch_current'?: string;
    sfc?: string;
    searchFetchCurrent?: string;
    'search.fetch_time'?: string;
    sfti?: string;
    searchFetchTime?: string;
    'search.fetch_total'?: string;
    sfto?: string;
    searchFetchTotal?: string;
    'search.open_contexts'?: string;
    so?: string;
    searchOpenContexts?: string;
    'search.query_current'?: string;
    sqc?: string;
    searchQueryCurrent?: string;
    'search.query_time'?: string;
    sqti?: string;
    searchQueryTime?: string;
    'search.query_total'?: string;
    sqto?: string;
    searchQueryTotal?: string;
    'search.scroll_current'?: string;
    scc?: string;
    searchScrollCurrent?: string;
    'search.scroll_time'?: string;
    scti?: string;
    searchScrollTime?: string;
    'search.scroll_total'?: string;
    scto?: string;
    searchScrollTotal?: string;
    'segments.count'?: string;
    sc?: string;
    segmentsCount?: string;
    'segments.memory'?: string;
    sm?: string;
    segmentsMemory?: string;
    'segments.index_writer_memory'?: string;
    siwm?: string;
    segmentsIndexWriterMemory?: string;
    'segments.version_map_memory'?: string;
    svmm?: string;
    segmentsVersionMapMemory?: string;
    'segments.fixed_bitset_memory'?: string;
    sfbm?: string;
    fixedBitsetMemory?: string;
    'seq_no.max'?: string;
    sqm?: string;
    maxSeqNo?: string;
    'seq_no.local_checkpoint'?: string;
    sql?: string;
    localCheckpoint?: string;
    'seq_no.global_checkpoint'?: string;
    sqg?: string;
    globalCheckpoint?: string;
    'warmer.current'?: string;
    wc?: string;
    warmerCurrent?: string;
    'warmer.total'?: string;
    wto?: string;
    warmerTotal?: string;
    'warmer.total_time'?: string;
    wtt?: string;
    warmerTotalTime?: string;
    'path.data'?: string;
    pd?: string;
    dataPath?: string;
    'path.state'?: string;
    ps?: string;
    statsPath?: string;
    'bulk.total_operations'?: string;
    bto?: string;
    bulkTotalOperations?: string;
    'bulk.total_time'?: string;
    btti?: string;
    bulkTotalTime?: string;
    'bulk.total_size_in_bytes'?: string;
    btsi?: string;
    bulkTotalSizeInBytes?: string;
    'bulk.avg_time'?: string;
    bati?: string;
    bulkAvgTime?: string;
    'bulk.avg_size_in_bytes'?: string;
    basi?: string;
    bulkAvgSizeInBytes?: string;
}
export interface CatSnapshotsRequest extends CatCatRequestBase {
    repository?: Names;
    ignore_unavailable?: boolean;
}
export type CatSnapshotsResponse = CatSnapshotsSnapshotsRecord[];
export interface CatSnapshotsSnapshotsRecord {
    id?: string;
    snapshot?: string;
    repository?: string;
    re?: string;
    repo?: string;
    status?: string;
    s?: string;
    start_epoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    ste?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    startEpoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    start_time?: WatcherScheduleTimeOfDay;
    sti?: WatcherScheduleTimeOfDay;
    startTime?: WatcherScheduleTimeOfDay;
    end_epoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    ete?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    endEpoch?: SpecUtilsStringified<EpochTime<UnitSeconds>>;
    end_time?: TimeOfDay;
    eti?: TimeOfDay;
    endTime?: TimeOfDay;
    duration?: Duration;
    dur?: Duration;
    indices?: string;
    i?: string;
    successful_shards?: string;
    ss?: string;
    failed_shards?: string;
    fs?: string;
    total_shards?: string;
    ts?: string;
    reason?: string;
    r?: string;
}
export interface CatTasksRequest extends CatCatRequestBase {
    actions?: string[];
    detailed?: boolean;
    node_id?: string[];
    parent_task_id?: string;
}
export type CatTasksResponse = CatTasksTasksRecord[];
export interface CatTasksTasksRecord {
    id?: Id;
    action?: string;
    ac?: string;
    task_id?: Id;
    ti?: Id;
    parent_task_id?: string;
    pti?: string;
    type?: string;
    ty?: string;
    start_time?: string;
    start?: string;
    timestamp?: string;
    ts?: string;
    hms?: string;
    hhmmss?: string;
    running_time_ns?: string;
    running_time?: string;
    time?: string;
    node_id?: NodeId;
    ni?: NodeId;
    ip?: string;
    i?: string;
    port?: string;
    po?: string;
    node?: string;
    n?: string;
    version?: VersionString;
    v?: VersionString;
    x_opaque_id?: string;
    x?: string;
    description?: string;
    desc?: string;
}
export interface CatTemplatesRequest extends CatCatRequestBase {
    name?: Name;
}
export type CatTemplatesResponse = CatTemplatesTemplatesRecord[];
export interface CatTemplatesTemplatesRecord {
    name?: Name;
    n?: Name;
    index_patterns?: string;
    t?: string;
    order?: string;
    o?: string;
    p?: string;
    version?: VersionString | null;
    v?: VersionString | null;
    composed_of?: string;
    c?: string;
}
export interface CatThreadPoolRequest extends CatCatRequestBase {
    thread_pool_patterns?: Names;
    time?: TimeUnit;
}
export type CatThreadPoolResponse = CatThreadPoolThreadPoolRecord[];
export interface CatThreadPoolThreadPoolRecord {
    node_name?: string;
    nn?: string;
    node_id?: NodeId;
    id?: NodeId;
    ephemeral_node_id?: string;
    eid?: string;
    pid?: string;
    p?: string;
    host?: string;
    h?: string;
    ip?: string;
    i?: string;
    port?: string;
    po?: string;
    name?: string;
    n?: string;
    type?: string;
    t?: string;
    active?: string;
    a?: string;
    pool_size?: string;
    psz?: string;
    queue?: string;
    q?: string;
    queue_size?: string;
    qs?: string;
    rejected?: string;
    r?: string;
    largest?: string;
    l?: string;
    completed?: string;
    c?: string;
    core?: string | null;
    cr?: string | null;
    max?: string | null;
    mx?: string | null;
    size?: string | null;
    sz?: string | null;
    keep_alive?: string | null;
    ka?: string | null;
}
export interface CatTransformsRequest extends CatCatRequestBase {
    transform_id?: Id;
    allow_no_match?: boolean;
    from?: integer;
    h?: CatCatTransformColumns;
    s?: CatCatTransformColumns;
    time?: TimeUnit;
    size?: integer;
}
export type CatTransformsResponse = CatTransformsTransformsRecord[];
export interface CatTransformsTransformsRecord {
    id?: Id;
    state?: string;
    s?: string;
    checkpoint?: string;
    c?: string;
    documents_processed?: string;
    docp?: string;
    documentsProcessed?: string;
    checkpoint_progress?: string | null;
    cp?: string | null;
    checkpointProgress?: string | null;
    last_search_time?: string | null;
    lst?: string | null;
    lastSearchTime?: string | null;
    changes_last_detection_time?: string | null;
    cldt?: string | null;
    create_time?: string;
    ct?: string;
    createTime?: string;
    version?: VersionString;
    v?: VersionString;
    source_index?: string;
    si?: string;
    sourceIndex?: string;
    dest_index?: string;
    di?: string;
    destIndex?: string;
    pipeline?: string;
    p?: string;
    description?: string;
    d?: string;
    transform_type?: string;
    tt?: string;
    frequency?: string;
    f?: string;
    max_page_search_size?: string;
    mpsz?: string;
    docs_per_second?: string;
    dps?: string;
    reason?: string;
    r?: string;
    search_total?: string;
    st?: string;
    search_failure?: string;
    sf?: string;
    search_time?: string;
    stime?: string;
    index_total?: string;
    it?: string;
    index_failure?: string;
    if?: string;
    index_time?: string;
    itime?: string;
    documents_indexed?: string;
    doci?: string;
    delete_time?: string;
    dtime?: string;
    documents_deleted?: string;
    docd?: string;
    trigger_count?: string;
    tc?: string;
    pages_processed?: string;
    pp?: string;
    processing_time?: string;
    pt?: string;
    checkpoint_duration_time_exp_avg?: string;
    cdtea?: string;
    checkpointTimeExpAvg?: string;
    indexed_documents_exp_avg?: string;
    idea?: string;
    processed_documents_exp_avg?: string;
    pdea?: string;
}
export interface CcrFollowIndexStats {
    index: IndexName;
    shards: CcrShardStats[];
}
export interface CcrReadException {
    exception: ErrorCause;
    from_seq_no: SequenceNumber;
    retries: integer;
}
export interface CcrShardStats {
    bytes_read: long;
    failed_read_requests: long;
    failed_write_requests: long;
    fatal_exception?: ErrorCause;
    follower_aliases_version: VersionNumber;
    follower_global_checkpoint: long;
    follower_index: string;
    follower_mapping_version: VersionNumber;
    follower_max_seq_no: SequenceNumber;
    follower_settings_version: VersionNumber;
    last_requested_seq_no: SequenceNumber;
    leader_global_checkpoint: long;
    leader_index: string;
    leader_max_seq_no: SequenceNumber;
    operations_read: long;
    operations_written: long;
    outstanding_read_requests: integer;
    outstanding_write_requests: integer;
    read_exceptions: CcrReadException[];
    remote_cluster: string;
    shard_id: integer;
    successful_read_requests: long;
    successful_write_requests: long;
    time_since_last_read?: Duration;
    time_since_last_read_millis: DurationValue<UnitMillis>;
    total_read_remote_exec_time?: Duration;
    total_read_remote_exec_time_millis: DurationValue<UnitMillis>;
    total_read_time?: Duration;
    total_read_time_millis: DurationValue<UnitMillis>;
    total_write_time?: Duration;
    total_write_time_millis: DurationValue<UnitMillis>;
    write_buffer_operation_count: long;
    write_buffer_size_in_bytes: ByteSize;
}
export interface CcrDeleteAutoFollowPatternRequest extends RequestBase {
    name: Name;
}
export type CcrDeleteAutoFollowPatternResponse = AcknowledgedResponseBase;
export interface CcrFollowRequest extends RequestBase {
    index: IndexName;
    wait_for_active_shards?: WaitForActiveShards;
    leader_index?: IndexName;
    max_outstanding_read_requests?: long;
    max_outstanding_write_requests?: long;
    max_read_request_operation_count?: long;
    max_read_request_size?: string;
    max_retry_delay?: Duration;
    max_write_buffer_count?: long;
    max_write_buffer_size?: string;
    max_write_request_operation_count?: long;
    max_write_request_size?: string;

    remote_cluster?: string;
}
export interface CcrFollowResponse {
    follow_index_created: boolean;
    follow_index_shards_acked: boolean;
    index_following_started: boolean;
}
export interface CcrFollowInfoFollowerIndex {
    follower_index: IndexName;
    leader_index: IndexName;
    parameters?: CcrFollowInfoFollowerIndexParameters;
    remote_cluster: Name;
    status: CcrFollowInfoFollowerIndexStatus;
}
export interface CcrFollowInfoFollowerIndexParameters {
    max_outstanding_read_requests: integer;
    max_outstanding_write_requests: integer;
    max_read_request_operation_count: integer;
    max_read_request_size: string;
    max_retry_delay: Duration;
    max_write_buffer_count: integer;
    max_write_buffer_size: string;
    max_write_request_operation_count: integer;
    max_write_request_size: string;

}
export type CcrFollowInfoFollowerIndexStatus = 'active' | 'paused';
export interface CcrFollowInfoRequest extends RequestBase {
    index: Indices;
}
export interface CcrFollowInfoResponse {
    follower_indices: CcrFollowInfoFollowerIndex[];
}
export interface CcrFollowStatsRequest extends RequestBase {
    index: Indices;
}
export interface CcrFollowStatsResponse {
    indices: CcrFollowIndexStats[];
}
export interface CcrForgetFollowerRequest extends RequestBase {
    index: IndexName;
    follower_cluster?: string;
    follower_index?: IndexName;
    follower_index_uuid?: Uuid;
    leader_remote_cluster?: string;
}
export interface CcrForgetFollowerResponse {
    _shards: ShardStatistics;
}
export interface CcrGetAutoFollowPatternAutoFollowPattern {
    name: Name;
    pattern: CcrGetAutoFollowPatternAutoFollowPatternSummary;
}
export interface CcrGetAutoFollowPatternAutoFollowPatternSummary {
    active: boolean;
    remote_cluster: string;
    follow_index_pattern?: IndexPattern;
    leader_index_patterns: IndexPatterns;
    leader_index_exclusion_patterns: IndexPatterns;
    max_outstanding_read_requests: integer;
}
export interface CcrGetAutoFollowPatternRequest extends RequestBase {
    name?: Name;
}
export interface CcrGetAutoFollowPatternResponse {
    patterns: CcrGetAutoFollowPatternAutoFollowPattern[];
}
export interface CcrPauseAutoFollowPatternRequest extends RequestBase {
    name: Name;
}
export type CcrPauseAutoFollowPatternResponse = AcknowledgedResponseBase;
export interface CcrPauseFollowRequest extends RequestBase {
    index: IndexName;
}
export type CcrPauseFollowResponse = AcknowledgedResponseBase;
export interface CcrPutAutoFollowPatternRequest extends RequestBase {
    name: Name;
    remote_cluster: string;
    follow_index_pattern?: IndexPattern;
    leader_index_patterns?: IndexPatterns;
    leader_index_exclusion_patterns?: IndexPatterns;
    max_outstanding_read_requests?: integer;
    settings?: Record<string, any>;
    max_outstanding_write_requests?: integer;

    max_read_request_operation_count?: integer;
    max_read_request_size?: ByteSize;
    max_retry_delay?: Duration;
    max_write_buffer_count?: integer;
    max_write_buffer_size?: ByteSize;
    max_write_request_operation_count?: integer;
    max_write_request_size?: ByteSize;
}
export type CcrPutAutoFollowPatternResponse = AcknowledgedResponseBase;
export interface CcrResumeAutoFollowPatternRequest extends RequestBase {
    name: Name;
}
export type CcrResumeAutoFollowPatternResponse = AcknowledgedResponseBase;
export interface CcrResumeFollowRequest extends RequestBase {
    index: IndexName;
    max_outstanding_read_requests?: long;
    max_outstanding_write_requests?: long;
    max_read_request_operation_count?: long;
    max_read_request_size?: string;
    max_retry_delay?: Duration;
    max_write_buffer_count?: long;
    max_write_buffer_size?: string;
    max_write_request_operation_count?: long;
    max_write_request_size?: string;

}
export type CcrResumeFollowResponse = AcknowledgedResponseBase;
export interface CcrStatsAutoFollowStats {
    auto_followed_clusters: CcrStatsAutoFollowedCluster[];
    number_of_failed_follow_indices: long;
    number_of_failed_remote_cluster_state_requests: long;
    number_of_successful_follow_indices: long;
    recent_auto_follow_errors: ErrorCause[];
}
export interface CcrStatsAutoFollowedCluster {
    cluster_name: Name;
    last_seen_metadata_version: VersionNumber;
    time_since_last_check_millis: DurationValue<UnitMillis>;
}
export interface CcrStatsFollowStats {
    indices: CcrFollowIndexStats[];
}
export interface CcrStatsRequest extends RequestBase {
}
export interface CcrStatsResponse {
    auto_follow_stats: CcrStatsAutoFollowStats;
    follow_stats: CcrStatsFollowStats;
}
export interface CcrUnfollowRequest extends RequestBase {
    index: IndexName;
}
export type CcrUnfollowResponse = AcknowledgedResponseBase;
export interface ClusterComponentTemplate {
    name: Name;
    component_template: ClusterComponentTemplateNode;
}
export interface ClusterComponentTemplateNode {
    template: ClusterComponentTemplateSummary;
    version?: VersionNumber;
    _meta?: Metadata;
}
export interface ClusterComponentTemplateSummary {
    _meta?: Metadata;
    version?: VersionNumber;
    settings?: Record<IndexName, IndicesIndexSettings>;
    mappings?: MappingTypeMapping;
    aliases?: Record<string, IndicesAliasDefinition>;
    lifecycle?: IndicesDataStreamLifecycleWithRollover;
}
export interface ClusterAllocationExplainAllocationDecision {
    decider: string;
    decision: ClusterAllocationExplainAllocationExplainDecision;
    explanation: string;
}
export type ClusterAllocationExplainAllocationExplainDecision = 'NO' | 'YES' | 'THROTTLE' | 'ALWAYS';
export interface ClusterAllocationExplainAllocationStore {
    allocation_id: string;
    found: boolean;
    in_sync: boolean;
    matching_size_in_bytes: long;
    matching_sync_id: boolean;
    store_exception: string;
}
export interface ClusterAllocationExplainClusterInfo {
    nodes: Record<string, ClusterAllocationExplainNodeDiskUsage>;
    shard_sizes: Record<string, long>;
    shard_data_set_sizes?: Record<string, string>;
    shard_paths: Record<string, string>;
    reserved_sizes: ClusterAllocationExplainReservedSize[];
}
export interface ClusterAllocationExplainCurrentNode {
    id: Id;
    name: Name;
    attributes: Record<string, string>;
    transport_address: TransportAddress;
    weight_ranking: integer;
}
export type ClusterAllocationExplainDecision = 'yes' | 'no' | 'worse_balance' | 'throttled' | 'awaiting_info' | 'allocation_delayed' | 'no_valid_shard_copy' | 'no_attempt';
export interface ClusterAllocationExplainDiskUsage {
    path: string;
    total_bytes: long;
    used_bytes: long;
    free_bytes: long;
    free_disk_percent: double;
    used_disk_percent: double;
}
export interface ClusterAllocationExplainNodeAllocationExplanation {
    deciders: ClusterAllocationExplainAllocationDecision[];
    node_attributes: Record<string, string>;
    node_decision: ClusterAllocationExplainDecision;
    node_id: Id;
    node_name: Name;
    store?: ClusterAllocationExplainAllocationStore;
    transport_address: TransportAddress;
    weight_ranking: integer;
}
export interface ClusterAllocationExplainNodeDiskUsage {
    node_name: Name;
    least_available: ClusterAllocationExplainDiskUsage;
    most_available: ClusterAllocationExplainDiskUsage;
}
export interface ClusterAllocationExplainRequest extends RequestBase {
    include_disk_info?: boolean;
    include_yes_decisions?: boolean;
    current_node?: string;
    index?: IndexName;
    primary?: boolean;
    shard?: integer;
}
export interface ClusterAllocationExplainReservedSize {
    node_id: Id;
    path: string;
    total: long;
    shards: string[];
}
export interface ClusterAllocationExplainResponse {
    allocate_explanation?: string;
    allocation_delay?: Duration;
    allocation_delay_in_millis?: DurationValue<UnitMillis>;
    can_allocate?: ClusterAllocationExplainDecision;
    can_move_to_other_node?: ClusterAllocationExplainDecision;
    can_rebalance_cluster?: ClusterAllocationExplainDecision;
    can_rebalance_cluster_decisions?: ClusterAllocationExplainAllocationDecision[];
    can_rebalance_to_other_node?: ClusterAllocationExplainDecision;
    can_remain_decisions?: ClusterAllocationExplainAllocationDecision[];
    can_remain_on_current_node?: ClusterAllocationExplainDecision;
    cluster_info?: ClusterAllocationExplainClusterInfo;
    configured_delay?: Duration;
    configured_delay_in_millis?: DurationValue<UnitMillis>;
    current_node?: ClusterAllocationExplainCurrentNode;
    current_state: string;
    index: IndexName;
    move_explanation?: string;
    node_allocation_decisions?: ClusterAllocationExplainNodeAllocationExplanation[];
    primary: boolean;
    rebalance_explanation?: string;
    remaining_delay?: Duration;
    remaining_delay_in_millis?: DurationValue<UnitMillis>;
    shard: integer;
    unassigned_info?: ClusterAllocationExplainUnassignedInformation;
    note?: string;
}
export interface ClusterAllocationExplainUnassignedInformation {
    at: DateTime;
    last_allocation_status?: string;
    reason: ClusterAllocationExplainUnassignedInformationReason;
    details?: string;
    failed_allocation_attempts?: integer;
    delayed?: boolean;
    allocation_status?: string;
}
export type ClusterAllocationExplainUnassignedInformationReason = 'INDEX_CREATED' | 'CLUSTER_RECOVERED' | 'INDEX_REOPENED' | 'DANGLING_INDEX_IMPORTED' | 'NEW_INDEX_RESTORED' | 'EXISTING_INDEX_RESTORED' | 'REPLICA_ADDED' | 'ALLOCATION_FAILED' | 'NODE_LEFT' | 'REROUTE_CANCELLED' | 'REINITIALIZED' | 'REALLOCATED_REPLICA' | 'PRIMARY_FAILED' | 'FORCED_EMPTY_PRIMARY' | 'MANUAL_ALLOCATION';
export interface ClusterDeleteComponentTemplateRequest extends RequestBase {
    name: Names;


}
export type ClusterDeleteComponentTemplateResponse = AcknowledgedResponseBase;
export interface ClusterDeleteVotingConfigExclusionsRequest extends RequestBase {
    wait_for_removal?: boolean;
}
export type ClusterDeleteVotingConfigExclusionsResponse = boolean;
export interface ClusterExistsComponentTemplateRequest extends RequestBase {
    name: Names;

    local?: boolean;
}
export type ClusterExistsComponentTemplateResponse = boolean;
export interface ClusterGetComponentTemplateRequest extends RequestBase {
    name?: Name;
    flat_settings?: boolean;
    include_defaults?: boolean;
    local?: boolean;

}
export interface ClusterGetComponentTemplateResponse {
    component_templates: ClusterComponentTemplate[];
}
export interface ClusterGetSettingsRequest extends RequestBase {
    flat_settings?: boolean;
    include_defaults?: boolean;


}
export interface ClusterGetSettingsResponse {
    persistent: Record<string, any>;
    transient: Record<string, any>;
    defaults?: Record<string, any>;
}
export interface ClusterHealthHealthResponseBody {
    active_primary_shards: integer;
    active_shards: integer;
    active_shards_percent_as_number: Percentage;
    cluster_name: Name;
    delayed_unassigned_shards: integer;
    indices?: Record<IndexName, ClusterHealthIndexHealthStats>;
    initializing_shards: integer;
    number_of_data_nodes: integer;
    number_of_in_flight_fetch: integer;
    number_of_nodes: integer;
    number_of_pending_tasks: integer;
    relocating_shards: integer;
    status: HealthStatus;
    task_max_waiting_in_queue?: Duration;
    task_max_waiting_in_queue_millis: DurationValue<UnitMillis>;
    timed_out: boolean;
    unassigned_shards: integer;
}
export interface ClusterHealthIndexHealthStats {
    active_primary_shards: integer;
    active_shards: integer;
    initializing_shards: integer;
    number_of_replicas: integer;
    number_of_shards: integer;
    relocating_shards: integer;
    shards?: Record<string, ClusterHealthShardHealthStats>;
    status: HealthStatus;
    unassigned_shards: integer;
}
export interface ClusterHealthRequest extends RequestBase {
    index?: Indices;
    expand_wildcards?: ExpandWildcards;
    level?: Level;
    local?: boolean;


    wait_for_active_shards?: WaitForActiveShards;
    wait_for_events?: WaitForEvents;
    wait_for_nodes?: string | integer;
    wait_for_no_initializing_shards?: boolean;
    wait_for_no_relocating_shards?: boolean;
    wait_for_status?: HealthStatus;
}
export type ClusterHealthResponse = ClusterHealthHealthResponseBody;
export interface ClusterHealthShardHealthStats {
    active_shards: integer;
    initializing_shards: integer;
    primary_active: boolean;
    relocating_shards: integer;
    status: HealthStatus;
    unassigned_shards: integer;
}
export interface ClusterInfoRequest extends RequestBase {
    target: ClusterInfoTargets;
}
export interface ClusterInfoResponse {
    cluster_name: Name;
    http?: NodesHttp;
    ingest?: NodesIngest;
    thread_pool?: Record<string, NodesThreadCount>;
    script?: NodesScripting;
}
export interface ClusterPendingTasksPendingTask {
    executing: boolean;
    insert_order: integer;
    priority: string;
    source: string;
    time_in_queue?: Duration;
    time_in_queue_millis: DurationValue<UnitMillis>;
}
export interface ClusterPendingTasksRequest extends RequestBase {
    local?: boolean;

}
export interface ClusterPendingTasksResponse {
    tasks: ClusterPendingTasksPendingTask[];
}
export interface ClusterPostVotingConfigExclusionsRequest extends RequestBase {
    node_names?: Names;
    node_ids?: Ids;

}
export type ClusterPostVotingConfigExclusionsResponse = boolean;
export interface ClusterPutComponentTemplateRequest extends RequestBase {
    name: Name;
    create?: boolean;

    template: IndicesIndexState;
    version?: VersionNumber;
    _meta?: Metadata;
    deprecated?: boolean;
}
export type ClusterPutComponentTemplateResponse = AcknowledgedResponseBase;
export interface ClusterPutSettingsRequest extends RequestBase {
    flat_settings?: boolean;


    persistent?: Record<string, any>;
    transient?: Record<string, any>;
}
export interface ClusterPutSettingsResponse {
    acknowledged: boolean;
    persistent: Record<string, any>;
    transient: Record<string, any>;
}
export type ClusterRemoteInfoClusterRemoteInfo = ClusterRemoteInfoClusterRemoteSniffInfo | ClusterRemoteInfoClusterRemoteProxyInfo;
export interface ClusterRemoteInfoClusterRemoteProxyInfo {
    mode: 'proxy';
    connected: boolean;

    skip_unavailable: boolean;
    proxy_address: string;
    server_name: string;
    num_proxy_sockets_connected: integer;
    max_proxy_socket_connections: integer;
}
export interface ClusterRemoteInfoClusterRemoteSniffInfo {
    mode: 'sniff';
    connected: boolean;
    max_connections_per_cluster: integer;
    num_nodes_connected: long;

    skip_unavailable: boolean;
    seeds: string[];
}
export interface ClusterRemoteInfoRequest extends RequestBase {
}
export type ClusterRemoteInfoResponse = Record<string, ClusterRemoteInfoClusterRemoteInfo>;
export interface ClusterRerouteCommand {
    cancel?: ClusterRerouteCommandCancelAction;
    move?: ClusterRerouteCommandMoveAction;
    allocate_replica?: ClusterRerouteCommandAllocateReplicaAction;
    allocate_stale_primary?: ClusterRerouteCommandAllocatePrimaryAction;
    allocate_empty_primary?: ClusterRerouteCommandAllocatePrimaryAction;
}
export interface ClusterRerouteCommandAllocatePrimaryAction {
    index: IndexName;
    shard: integer;
    node: string;
    accept_data_loss: boolean;
}
export interface ClusterRerouteCommandAllocateReplicaAction {
    index: IndexName;
    shard: integer;
    node: string;
}
export interface ClusterRerouteCommandCancelAction {
    index: IndexName;
    shard: integer;
    node: string;
    allow_primary?: boolean;
}
export interface ClusterRerouteCommandMoveAction {
    index: IndexName;
    shard: integer;
    from_node: string;
    to_node: string;
}
export interface ClusterRerouteRequest extends RequestBase {
    dry_run?: boolean;
    explain?: boolean;
    metric?: Metrics;
    retry_failed?: boolean;


    commands?: ClusterRerouteCommand[];
}
export interface ClusterRerouteRerouteDecision {
    decider: string;
    decision: string;
    explanation: string;
}
export interface ClusterRerouteRerouteExplanation {
    command: string;
    decisions: ClusterRerouteRerouteDecision[];
    parameters: ClusterRerouteRerouteParameters;
}
export interface ClusterRerouteRerouteParameters {
    allow_primary: boolean;
    index: IndexName;
    node: NodeName;
    shard: integer;
    from_node?: NodeName;
    to_node?: NodeName;
}
export interface ClusterRerouteResponse {
    acknowledged: boolean;
    explanations?: ClusterRerouteRerouteExplanation[];
    state?: any;
}
export interface ClusterStateRequest extends RequestBase {
    metric?: Metrics;
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flat_settings?: boolean;
    ignore_unavailable?: boolean;
    local?: boolean;

    wait_for_metadata_version?: VersionNumber;

}
export type ClusterStateResponse = any;
export interface ClusterStatsCharFilterTypes {
    analyzer_types: ClusterStatsFieldTypes[];
    built_in_analyzers: ClusterStatsFieldTypes[];
    built_in_char_filters: ClusterStatsFieldTypes[];
    built_in_filters: ClusterStatsFieldTypes[];
    built_in_tokenizers: ClusterStatsFieldTypes[];
    char_filter_types: ClusterStatsFieldTypes[];
    filter_types: ClusterStatsFieldTypes[];
    tokenizer_types: ClusterStatsFieldTypes[];
}
export interface ClusterStatsClusterFileSystem {
    available_in_bytes: long;
    free_in_bytes: long;
    total_in_bytes: long;
}
export interface ClusterStatsClusterIndices {
    analysis: ClusterStatsCharFilterTypes;
    completion: CompletionStats;
    count: long;
    docs: DocStats;
    fielddata: FielddataStats;
    query_cache: QueryCacheStats;
    segments: SegmentsStats;
    shards: ClusterStatsClusterIndicesShards;
    store: StoreStats;
    mappings: ClusterStatsFieldTypesMappings;
    versions?: ClusterStatsIndicesVersions[];
}
export interface ClusterStatsClusterIndicesShards {
    index?: ClusterStatsClusterIndicesShardsIndex;
    primaries?: double;
    replication?: double;
    total?: double;
}
export interface ClusterStatsClusterIndicesShardsIndex {
    primaries: ClusterStatsClusterShardMetrics;
    replication: ClusterStatsClusterShardMetrics;
    shards: ClusterStatsClusterShardMetrics;
}
export interface ClusterStatsClusterIngest {
    number_of_pipelines: integer;
    processor_stats: Record<string, ClusterStatsClusterProcessor>;
}
export interface ClusterStatsClusterJvm {
    max_uptime_in_millis: DurationValue<UnitMillis>;
    mem: ClusterStatsClusterJvmMemory;
    threads: long;
    versions: ClusterStatsClusterJvmVersion[];
}
export interface ClusterStatsClusterJvmMemory {
    heap_max_in_bytes: long;
    heap_used_in_bytes: long;
}
export interface ClusterStatsClusterJvmVersion {
    bundled_jdk: boolean;
    count: integer;
    using_bundled_jdk: boolean;
    version: VersionString;
    vm_name: string;
    vm_vendor: string;
    vm_version: VersionString;
}
export interface ClusterStatsClusterNetworkTypes {
    http_types: Record<string, integer>;
    transport_types: Record<string, integer>;
}
export interface ClusterStatsClusterNodeCount {
    coordinating_only: integer;
    data: integer;
    data_cold: integer;
    data_content: integer;
    data_frozen?: integer;
    data_hot: integer;
    data_warm: integer;
    ingest: integer;
    master: integer;
    ml: integer;
    remote_cluster_client: integer;
    total: integer;
    transform: integer;
    voting_only: integer;
}
export interface ClusterStatsClusterNodes {
    count: ClusterStatsClusterNodeCount;
    discovery_types: Record<string, integer>;
    fs: ClusterStatsClusterFileSystem;
    indexing_pressure: ClusterStatsIndexingPressure;
    ingest: ClusterStatsClusterIngest;
    jvm: ClusterStatsClusterJvm;
    network_types: ClusterStatsClusterNetworkTypes;
    os: ClusterStatsClusterOperatingSystem;
    packaging_types: ClusterStatsNodePackagingType[];
    plugins: PluginStats[];
    process: ClusterStatsClusterProcess;
    versions: VersionString[];
}
export interface ClusterStatsClusterOperatingSystem {
    allocated_processors: integer;
    architectures?: ClusterStatsClusterOperatingSystemArchitecture[];
    available_processors: integer;
    mem: ClusterStatsOperatingSystemMemoryInfo;
    names: ClusterStatsClusterOperatingSystemName[];
    pretty_names: ClusterStatsClusterOperatingSystemPrettyName[];
}
export interface ClusterStatsClusterOperatingSystemArchitecture {
    arch: string;
    count: integer;
}
export interface ClusterStatsClusterOperatingSystemName {
    count: integer;
    name: Name;
}
export interface ClusterStatsClusterOperatingSystemPrettyName {
    count: integer;
    pretty_name: Name;
}
export interface ClusterStatsClusterProcess {
    cpu: ClusterStatsClusterProcessCpu;
    open_file_descriptors: ClusterStatsClusterProcessOpenFileDescriptors;
}
export interface ClusterStatsClusterProcessCpu {
    percent: integer;
}
export interface ClusterStatsClusterProcessOpenFileDescriptors {
    avg: long;
    max: long;
    min: long;
}
export interface ClusterStatsClusterProcessor {
    count: long;
    current: long;
    failed: long;
    time?: Duration;
    time_in_millis: DurationValue<UnitMillis>;
}
export interface ClusterStatsClusterShardMetrics {
    avg: double;
    max: double;
    min: double;
}
export interface ClusterStatsFieldTypes {
    name: Name;
    count: integer;
    index_count: integer;
    indexed_vector_count?: long;
    indexed_vector_dim_max?: long;
    indexed_vector_dim_min?: long;
    script_count?: integer;
}
export interface ClusterStatsFieldTypesMappings {
    field_types: ClusterStatsFieldTypes[];
    runtime_field_types?: ClusterStatsRuntimeFieldTypes[];
    total_field_count?: integer;
    total_deduplicated_field_count?: integer;
    total_deduplicated_mapping_size?: ByteSize;
    total_deduplicated_mapping_size_in_bytes?: long;
}
export interface ClusterStatsIndexingPressure {
    memory: ClusterStatsIndexingPressureMemory;
}
export interface ClusterStatsIndexingPressureMemory {
    current: ClusterStatsIndexingPressureMemorySummary;
    limit_in_bytes: long;
    total: ClusterStatsIndexingPressureMemorySummary;
}
export interface ClusterStatsIndexingPressureMemorySummary {
    all_in_bytes: long;
    combined_coordinating_and_primary_in_bytes: long;
    coordinating_in_bytes: long;
    coordinating_rejections?: long;
    primary_in_bytes: long;
    primary_rejections?: long;
    replica_in_bytes: long;
    replica_rejections?: long;
}
export interface ClusterStatsIndicesVersions {
    index_count: integer;
    primary_shard_count: integer;
    total_primary_bytes: long;
    version: VersionString;
}
export interface ClusterStatsNodePackagingType {
    count: integer;
    flavor: string;
    type: string;
}
export interface ClusterStatsOperatingSystemMemoryInfo {
    adjusted_total_in_bytes?: long;
    free_in_bytes: long;
    free_percent: integer;
    total_in_bytes: long;
    used_in_bytes: long;
    used_percent: integer;
}
export interface ClusterStatsRequest extends RequestBase {
    node_id?: NodeIds;
    flat_settings?: boolean;

}
export type ClusterStatsResponse = ClusterStatsStatsResponseBase;
export interface ClusterStatsRuntimeFieldTypes {
    chars_max: integer;
    chars_total: integer;
    count: integer;
    doc_max: integer;
    doc_total: integer;
    index_count: integer;
    lang: string[];
    lines_max: integer;
    lines_total: integer;
    name: Name;
    scriptless_count: integer;
    shadowed_count: integer;
    source_max: integer;
    source_total: integer;
}
export interface ClusterStatsStatsResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    cluster_uuid: Uuid;
    indices: ClusterStatsClusterIndices;
    nodes: ClusterStatsClusterNodes;
    status: HealthStatus;
    timestamp: long;
}
export interface ConnectorConnector {
    api_key_id?: string;
    api_key_secret_id?: string;
    configuration: ConnectorConnectorConfiguration;
    custom_scheduling: ConnectorConnectorCustomScheduling;
    description?: string;
    error?: string | null;
    features?: ConnectorConnectorFeatures;
    filtering: ConnectorFilteringConfig[];
    id?: Id;
    index_name?: IndexName | null;
    is_native: boolean;
    language?: string;
    last_access_control_sync_error?: string;
    last_access_control_sync_scheduled_at?: DateTime;
    last_access_control_sync_status?: ConnectorSyncStatus;
    last_deleted_document_count?: long;
    last_incremental_sync_scheduled_at?: DateTime;
    last_indexed_document_count?: long;
    last_seen?: DateTime;
    last_sync_error?: string;
    last_sync_scheduled_at?: DateTime;
    last_sync_status?: ConnectorSyncStatus;
    last_synced?: DateTime;
    name?: string;
    pipeline?: ConnectorIngestPipelineParams;
    scheduling: ConnectorSchedulingConfiguration;
    service_type?: string;
    status: ConnectorConnectorStatus;
    sync_cursor?: any;
    sync_now: boolean;
}
export interface ConnectorConnectorConfigProperties {
    category?: string;
    default_value: ScalarValue;
    depends_on: ConnectorDependency[];
    display: ConnectorDisplayType;
    label: string;
    options: ConnectorSelectOption[];
    order?: integer;
    placeholder?: string;
    required: boolean;
    sensitive: boolean;
    tooltip?: string | null;
    type?: ConnectorConnectorFieldType;
    ui_restrictions?: string[];
    validations?: ConnectorValidation[];
    value: any;
}
export type ConnectorConnectorConfiguration = Record<string, ConnectorConnectorConfigProperties>;
export type ConnectorConnectorCustomScheduling = Record<string, ConnectorCustomScheduling>;
export interface ConnectorConnectorFeatures {
    document_level_security?: ConnectorFeatureEnabled;
    incremental_sync?: ConnectorFeatureEnabled;
    native_connector_api_keys?: ConnectorFeatureEnabled;
    sync_rules?: ConnectorSyncRulesFeature;
}
export type ConnectorConnectorFieldType = 'str' | 'int' | 'list' | 'bool';
export interface ConnectorConnectorScheduling {
    enabled: boolean;
    interval: string;
}
export type ConnectorConnectorStatus = 'created' | 'needs_configuration' | 'configured' | 'connected' | 'error';
export interface ConnectorConnectorSyncJob {
    cancelation_requested_at?: DateTime;
    canceled_at?: DateTime;
    completed_at?: DateTime;
    connector: ConnectorSyncJobConnectorReference;
    created_at: DateTime;
    deleted_document_count: long;
    error?: string;
    id: Id;
    indexed_document_count: long;
    indexed_document_volume: long;
    job_type: ConnectorSyncJobType;
    last_seen?: DateTime;
    metadata: Record<string, any>;
    started_at?: DateTime;
    status: ConnectorSyncStatus;
    total_document_count: long;
    trigger_method: ConnectorSyncJobTriggerMethod;
    worker_hostname?: string;
}
export interface ConnectorCustomScheduling {
    configuration_overrides: ConnectorCustomSchedulingConfigurationOverrides;
    enabled: boolean;
    interval: string;
    last_synced?: DateTime;
    name: string;
}
export interface ConnectorCustomSchedulingConfigurationOverrides {
    max_crawl_depth?: integer;
    sitemap_discovery_disabled?: boolean;
    domain_allowlist?: string[];
    sitemap_urls?: string[];
    seed_urls?: string[];
}
export interface ConnectorDependency {
    field: string;
    value: ScalarValue;
}
export type ConnectorDisplayType = 'textbox' | 'textarea' | 'numeric' | 'toggle' | 'dropdown';
export interface ConnectorFeatureEnabled {
    enabled: boolean;
}
export interface ConnectorFilteringAdvancedSnippet {
    created_at?: DateTime;
    updated_at?: DateTime;
    value: Record<string, any>;
}
export interface ConnectorFilteringConfig {
    active: ConnectorFilteringRules;
    domain?: string;
    draft: ConnectorFilteringRules;
}
export type ConnectorFilteringPolicy = 'exclude' | 'include';
export interface ConnectorFilteringRule {
    created_at?: DateTime;
    field: Field;
    id: Id;
    order: integer;
    policy: ConnectorFilteringPolicy;
    rule: ConnectorFilteringRuleRule;
    updated_at?: DateTime;
    value: string;
}
export type ConnectorFilteringRuleRule = 'contains' | 'ends_with' | 'equals' | 'regex' | 'starts_with' | '>' | '<';
export interface ConnectorFilteringRules {
    advanced_snippet: ConnectorFilteringAdvancedSnippet;
    rules: ConnectorFilteringRule[];
    validation: ConnectorFilteringRulesValidation;
}
export interface ConnectorFilteringRulesValidation {
    errors: ConnectorFilteringValidation[];
    state: ConnectorFilteringValidationState;
}
export interface ConnectorFilteringValidation {
    ids: Id[];
    messages: string[];
}
export type ConnectorFilteringValidationState = 'edited' | 'invalid' | 'valid';
export interface ConnectorGreaterThanValidation {
    type: 'greater_than';
    constraint: double;
}
export interface ConnectorIncludedInValidation {
    type: 'included_in';
    constraint: ScalarValue[];
}
export interface ConnectorIngestPipelineParams {
    extract_binary_content: boolean;
    name: string;
    reduce_whitespace: boolean;
    run_ml_inference: boolean;
}
export interface ConnectorLessThanValidation {
    type: 'less_than';
    constraint: double;
}
export interface ConnectorListTypeValidation {
    type: 'list_type';
    constraint: string;
}
export interface ConnectorRegexValidation {
    type: 'regex';
    constraint: string;
}
export interface ConnectorSchedulingConfiguration {
    access_control?: ConnectorConnectorScheduling;
    full?: ConnectorConnectorScheduling;
    incremental?: ConnectorConnectorScheduling;
}
export interface ConnectorSelectOption {
    label: string;
    value: ScalarValue;
}
export interface ConnectorSyncJobConnectorReference {
    configuration: ConnectorConnectorConfiguration;
    filtering: ConnectorFilteringRules;
    id: Id;
    index_name: string;
    language?: string;
    pipeline?: ConnectorIngestPipelineParams;
    service_type: string;
    sync_cursor?: any;
}
export type ConnectorSyncJobTriggerMethod = 'on_demand' | 'scheduled';
export type ConnectorSyncJobType = 'full' | 'incremental' | 'access_control';
export interface ConnectorSyncRulesFeature {
    advanced?: ConnectorFeatureEnabled;
    basic?: ConnectorFeatureEnabled;
}
export type ConnectorSyncStatus = 'canceling' | 'canceled' | 'completed' | 'error' | 'in_progress' | 'pending' | 'suspended';
export type ConnectorValidation = ConnectorLessThanValidation | ConnectorGreaterThanValidation | ConnectorListTypeValidation | ConnectorIncludedInValidation | ConnectorRegexValidation;
export interface ConnectorCheckInRequest extends RequestBase {
    connector_id: Id;
}
export interface ConnectorCheckInResponse {
    result: Result;
}
export interface ConnectorDeleteRequest extends RequestBase {
    connector_id: Id;
    delete_sync_jobs?: boolean;
}
export type ConnectorDeleteResponse = AcknowledgedResponseBase;
export interface ConnectorGetRequest extends RequestBase {
    connector_id: Id;
}
export type ConnectorGetResponse = ConnectorConnector;
export interface ConnectorLastSyncRequest extends RequestBase {
    connector_id: Id;
    last_access_control_sync_error?: string;
    last_access_control_sync_scheduled_at?: DateTime;
    last_access_control_sync_status?: ConnectorSyncStatus;
    last_deleted_document_count?: long;
    last_incremental_sync_scheduled_at?: DateTime;
    last_indexed_document_count?: long;
    last_seen?: DateTime;
    last_sync_error?: string;
    last_sync_scheduled_at?: DateTime;
    last_sync_status?: ConnectorSyncStatus;
    last_synced?: DateTime;
    sync_cursor?: any;
}
export interface ConnectorLastSyncResponse {
    result: Result;
}
export interface ConnectorListRequest extends RequestBase {
    from?: integer;
    size?: integer;
    index_name?: Indices;
    connector_name?: Names;
    service_type?: Names;
    query?: string;
}
export interface ConnectorListResponse {
    count: long;
    results: ConnectorConnector[];
}
export interface ConnectorPostRequest extends RequestBase {
    description?: string;
    index_name?: IndexName;
    is_native?: boolean;
    language?: string;
    name?: string;
    service_type?: string;
}
export interface ConnectorPostResponse {
    result: Result;
    id: Id;
}
export interface ConnectorPutRequest extends RequestBase {
    connector_id?: Id;
    description?: string;
    index_name?: IndexName;
    is_native?: boolean;
    language?: string;
    name?: string;
    service_type?: string;
}
export interface ConnectorPutResponse {
    result: Result;
    id: Id;
}
export interface ConnectorSyncJobCancelRequest extends RequestBase {
    connector_sync_job_id: Id;
}
export interface ConnectorSyncJobCancelResponse {
    result: Result;
}
export interface ConnectorSyncJobDeleteRequest extends RequestBase {
    connector_sync_job_id: Id;
}
export type ConnectorSyncJobDeleteResponse = AcknowledgedResponseBase;
export interface ConnectorSyncJobGetRequest extends RequestBase {
    connector_sync_job_id: Id;
}
export type ConnectorSyncJobGetResponse = ConnectorConnectorSyncJob;
export interface ConnectorSyncJobListRequest extends RequestBase {
    from?: integer;
    size?: integer;
    status?: ConnectorSyncStatus;
    connector_id?: Id;
    job_type?: ConnectorSyncJobType | ConnectorSyncJobType[];
}
export interface ConnectorSyncJobListResponse {
    count: long;
    results: ConnectorConnectorSyncJob[];
}
export interface ConnectorSyncJobPostRequest extends RequestBase {
    id: Id;
    job_type?: ConnectorSyncJobType;
    trigger_method?: ConnectorSyncJobTriggerMethod;
}
export interface ConnectorSyncJobPostResponse {
    id: Id;
}
export interface ConnectorUpdateActiveFilteringRequest extends RequestBase {
    connector_id: Id;
}
export interface ConnectorUpdateActiveFilteringResponse {
    result: Result;
}
export interface ConnectorUpdateApiKeyIdRequest extends RequestBase {
    connector_id: Id;
    api_key_id?: string;
    api_key_secret_id?: string;
}
export interface ConnectorUpdateApiKeyIdResponse {
    result: Result;
}
export interface ConnectorUpdateConfigurationRequest extends RequestBase {
    connector_id: Id;
    configuration?: ConnectorConnectorConfiguration;
    values?: Record<string, any>;
}
export interface ConnectorUpdateConfigurationResponse {
    result: Result;
}
export interface ConnectorUpdateErrorRequest extends RequestBase {
    connector_id: Id;
    error: SpecUtilsWithNullValue<string>;
}
export interface ConnectorUpdateErrorResponse {
    result: Result;
}
export interface ConnectorUpdateFilteringRequest extends RequestBase {
    connector_id: Id;
    filtering?: ConnectorFilteringConfig[];
    rules?: ConnectorFilteringRule[];
    advanced_snippet?: ConnectorFilteringAdvancedSnippet;
}
export interface ConnectorUpdateFilteringResponse {
    result: Result;
}
export interface ConnectorUpdateFilteringValidationRequest extends RequestBase {
    connector_id: Id;
    validation: ConnectorFilteringRulesValidation;
}
export interface ConnectorUpdateFilteringValidationResponse {
    result: Result;
}
export interface ConnectorUpdateIndexNameRequest extends RequestBase {
    connector_id: Id;
    index_name: SpecUtilsWithNullValue<IndexName>;
}
export interface ConnectorUpdateIndexNameResponse {
    result: Result;
}
export interface ConnectorUpdateNameRequest extends RequestBase {
    connector_id: Id;
    name?: string;
    description?: string;
}
export interface ConnectorUpdateNameResponse {
    result: Result;
}
export interface ConnectorUpdateNativeRequest extends RequestBase {
    connector_id: Id;
    is_native: boolean;
}
export interface ConnectorUpdateNativeResponse {
    result: Result;
}
export interface ConnectorUpdatePipelineRequest extends RequestBase {
    connector_id: Id;
    pipeline: ConnectorIngestPipelineParams;
}
export interface ConnectorUpdatePipelineResponse {
    result: Result;
}
export interface ConnectorUpdateSchedulingRequest extends RequestBase {
    connector_id: Id;
    scheduling: ConnectorSchedulingConfiguration;
}
export interface ConnectorUpdateSchedulingResponse {
    result: Result;
}
export interface ConnectorUpdateServiceTypeRequest extends RequestBase {
    connector_id: Id;
    service_type: string;
}
export interface ConnectorUpdateServiceTypeResponse {
    result: Result;
}
export interface ConnectorUpdateStatusRequest extends RequestBase {
    connector_id: Id;
    status: ConnectorConnectorStatus;
}
export interface ConnectorUpdateStatusResponse {
    result: Result;
}
export interface DanglingIndicesDeleteDanglingIndexRequest extends RequestBase {
    index_uuid: Uuid;
    accept_data_loss: boolean;


}
export type DanglingIndicesDeleteDanglingIndexResponse = AcknowledgedResponseBase;
export interface DanglingIndicesImportDanglingIndexRequest extends RequestBase {
    index_uuid: Uuid;
    accept_data_loss: boolean;


}
export type DanglingIndicesImportDanglingIndexResponse = AcknowledgedResponseBase;
export interface DanglingIndicesListDanglingIndicesDanglingIndex {
    index_name: string;
    index_uuid: string;
    creation_date_millis: EpochTime<UnitMillis>;
    node_ids: Ids;
}
export interface DanglingIndicesListDanglingIndicesRequest extends RequestBase {
}
export interface DanglingIndicesListDanglingIndicesResponse {
    dangling_indices: DanglingIndicesListDanglingIndicesDanglingIndex[];
}
export interface EnrichPolicy {
    enrich_fields: Fields;
    indices: Indices;
    match_field: Field;
    query?: QueryDslQueryContainer;
    name?: Name;
    elasticsearch_version?: string;
}
export type EnrichPolicyType = 'geo_match' | 'match' | 'range';
export interface EnrichSummary {
    config: Partial<Record<EnrichPolicyType, EnrichPolicy>>;
}
export interface EnrichDeletePolicyRequest extends RequestBase {
    name: Name;
}
export type EnrichDeletePolicyResponse = AcknowledgedResponseBase;
export type EnrichExecutePolicyEnrichPolicyPhase = 'SCHEDULED' | 'RUNNING' | 'COMPLETE' | 'FAILED';
export interface EnrichExecutePolicyExecuteEnrichPolicyStatus {
    phase: EnrichExecutePolicyEnrichPolicyPhase;
}
export interface EnrichExecutePolicyRequest extends RequestBase {
    name: Name;
    wait_for_completion?: boolean;
}
export interface EnrichExecutePolicyResponse {
    status?: EnrichExecutePolicyExecuteEnrichPolicyStatus;
    task_id?: TaskId;
}
export interface EnrichGetPolicyRequest extends RequestBase {
    name?: Names;
}
export interface EnrichGetPolicyResponse {
    policies: EnrichSummary[];
}
export interface EnrichPutPolicyRequest extends RequestBase {
    name: Name;
    geo_match?: EnrichPolicy;
    match?: EnrichPolicy;
    range?: EnrichPolicy;
}
export type EnrichPutPolicyResponse = AcknowledgedResponseBase;
export interface EnrichStatsCacheStats {
    node_id: Id;
    count: integer;
    hits: integer;
    misses: integer;
    evictions: integer;
}
export interface EnrichStatsCoordinatorStats {
    executed_searches_total: long;
    node_id: Id;
    queue_size: integer;
    remote_requests_current: integer;
    remote_requests_total: long;
}
export interface EnrichStatsExecutingPolicy {
    name: Name;
    task: TasksTaskInfo;
}
export interface EnrichStatsRequest extends RequestBase {
}
export interface EnrichStatsResponse {
    coordinator_stats: EnrichStatsCoordinatorStats[];
    executing_policies: EnrichStatsExecutingPolicy[];
    cache_stats?: EnrichStatsCacheStats[];
}
export interface EqlEqlHits<TEvent = unknown> {
    total?: SearchTotalHits;
    events?: EqlHitsEvent<TEvent>[];
    sequences?: EqlHitsSequence<TEvent>[];
}
export interface EqlEqlSearchResponseBase<TEvent = unknown> {
    id?: Id;
    is_partial?: boolean;
    is_running?: boolean;
    took?: DurationValue<UnitMillis>;
    timed_out?: boolean;
    hits: EqlEqlHits<TEvent>;
}
export interface EqlHitsEvent<TEvent = unknown> {
    _index: IndexName;
    _id: Id;
    _source: TEvent;
    missing?: boolean;
    fields?: Record<Field, any[]>;
}
export interface EqlHitsSequence<TEvent = unknown> {
    events: EqlHitsEvent<TEvent>[];
    join_keys?: any[];
}
export interface EqlDeleteRequest extends RequestBase {
    id: Id;
}
export type EqlDeleteResponse = AcknowledgedResponseBase;
export interface EqlGetRequest extends RequestBase {
    id: Id;
    keep_alive?: Duration;

}
export type EqlGetResponse<TEvent = unknown> = EqlEqlSearchResponseBase<TEvent>;
export interface EqlGetStatusRequest extends RequestBase {
    id: Id;
}
export interface EqlGetStatusResponse {
    id: Id;
    is_partial: boolean;
    is_running: boolean;
    start_time_in_millis?: EpochTime<UnitMillis>;
    expiration_time_in_millis?: EpochTime<UnitMillis>;
    completion_status?: integer;
}
export interface EqlSearchRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    query: string;
    case_sensitive?: boolean;
    event_category_field?: Field;
    tiebreaker_field?: Field;
    timestamp_field?: Field;
    fetch_size?: uint;
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    keep_alive?: Duration;
    keep_on_completion?: boolean;

    size?: uint;
    fields?: QueryDslFieldAndFormat | Field | (QueryDslFieldAndFormat | Field)[];
    result_position?: EqlSearchResultPosition;
    runtime_mappings?: MappingRuntimeFields;
}
export type EqlSearchResponse<TEvent = unknown> = EqlEqlSearchResponseBase<TEvent>;
export type EqlSearchResultPosition = 'tail' | 'head';
export interface EsqlQueryRequest extends RequestBase {
    format?: string;
    delimiter?: string;
    columnar?: boolean;
    filter?: QueryDslQueryContainer;
    locale?: string;
    params?: ScalarValue[];
    query: string;
}
export type EsqlQueryResponse = EsqlColumns;
export interface FeaturesFeature {
    name: string;
    description: string;
}
export interface FeaturesGetFeaturesRequest extends RequestBase {
}
export interface FeaturesGetFeaturesResponse {
    features: FeaturesFeature[];
}
export interface FeaturesResetFeaturesRequest extends RequestBase {
}
export interface FeaturesResetFeaturesResponse {
    features: FeaturesFeature[];
}
export type FleetCheckpoint = long;
export interface FleetGlobalCheckpointsRequest extends RequestBase {
    index: IndexName | IndexAlias;
    wait_for_advance?: boolean;
    wait_for_index?: boolean;
    checkpoints?: FleetCheckpoint[];

}
export interface FleetGlobalCheckpointsResponse {
    global_checkpoints: FleetCheckpoint[];
    timed_out: boolean;
}
export interface FleetMsearchRequest extends RequestBase {
    index?: IndexName | IndexAlias;
    allow_no_indices?: boolean;
    ccs_minimize_roundtrips?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    max_concurrent_searches?: long;
    max_concurrent_shard_requests?: long;
    pre_filter_shard_size?: long;
    search_type?: SearchType;
    rest_total_hits_as_int?: boolean;
    typed_keys?: boolean;
    wait_for_checkpoints?: FleetCheckpoint[];
    allow_partial_search_results?: boolean;
    searches?: MsearchRequestItem[];
}
export interface FleetMsearchResponse<TDocument = unknown> {
    docs: MsearchResponseItem<TDocument>[];
}
export interface FleetSearchRequest extends RequestBase {
    index: IndexName | IndexAlias;
    allow_no_indices?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    batched_reduce_size?: long;
    ccs_minimize_roundtrips?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    max_concurrent_shard_requests?: long;
    min_compatible_shard_node?: VersionString;
    preference?: string;
    pre_filter_shard_size?: long;
    request_cache?: boolean;
    routing?: Routing;
    scroll?: Duration;
    search_type?: SearchType;
    suggest_field?: Field;
    suggest_mode?: SuggestMode;
    suggest_size?: long;
    suggest_text?: string;
    typed_keys?: boolean;
    rest_total_hits_as_int?: boolean;
    _source_excludes?: Fields;
    _source_includes?: Fields;
    q?: string;
    wait_for_checkpoints?: FleetCheckpoint[];
    allow_partial_search_results?: boolean;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    /** @alias aggregations */
    aggs?: Record<string, AggregationsAggregationContainer>;
    collapse?: SearchFieldCollapse;
    explain?: boolean;
    ext?: Record<string, any>;
    from?: integer;
    highlight?: SearchHighlight;
    track_total_hits?: SearchTrackHits;
    indices_boost?: Record<IndexName, double>[];
    docvalue_fields?: (QueryDslFieldAndFormat | Field)[];
    min_score?: double;
    post_filter?: QueryDslQueryContainer;
    profile?: boolean;
    query?: QueryDslQueryContainer;
    rescore?: SearchRescore | SearchRescore[];
    script_fields?: Record<string, ScriptField>;
    search_after?: SortResults;
    size?: integer;
    slice?: SlicedScroll;
    sort?: Sort;
    _source?: SearchSourceConfig;
    fields?: (QueryDslFieldAndFormat | Field)[];
    suggest?: SearchSuggester;
    terminate_after?: long;

    track_scores?: boolean;
    version?: boolean;
    seq_no_primary_term?: boolean;
    stored_fields?: Fields;
    pit?: SearchPointInTimeReference;
    runtime_mappings?: MappingRuntimeFields;
    stats?: string[];
}
export interface FleetSearchResponse<TDocument = unknown> {
    took: long;
    timed_out: boolean;
    _shards: ShardStatistics;
    hits: SearchHitsMetadata<TDocument>;
    aggregations?: Record<AggregateName, AggregationsAggregate>;
    _clusters?: ClusterStatistics;
    fields?: Record<string, any>;
    max_score?: double;
    num_reduce_phases?: long;
    profile?: SearchProfile;
    pit_id?: Id;
    _scroll_id?: ScrollId;
    suggest?: Record<SuggestionName, SearchSuggest<TDocument>[]>;
    terminated_early?: boolean;
}
export interface GraphConnection {
    doc_count: long;
    source: long;
    target: long;
    weight: double;
}
export interface GraphExploreControls {
    sample_diversity?: GraphSampleDiversity;
    sample_size?: integer;

    use_significance: boolean;
}
export interface GraphHop {
    connections?: GraphHop;
    query: QueryDslQueryContainer;
    vertices: GraphVertexDefinition[];
}
export interface GraphSampleDiversity {
    field: Field;
    max_docs_per_value: integer;
}
export interface GraphVertex {
    depth: long;
    field: Field;
    term: string;
    weight: double;
}
export interface GraphVertexDefinition {
    exclude?: string[];
    field: Field;
    include?: GraphVertexInclude[];
    min_doc_count?: long;
    shard_min_doc_count?: long;
    size?: integer;
}
export interface GraphVertexInclude {
    boost: double;
    term: string;
}
export interface GraphExploreRequest extends RequestBase {
    index: Indices;
    routing?: Routing;

    connections?: GraphHop;
    controls?: GraphExploreControls;
    query?: QueryDslQueryContainer;
    vertices?: GraphVertexDefinition[];
}
export interface GraphExploreResponse {
    connections: GraphConnection[];
    failures: ShardFailure[];
    timed_out: boolean;
    took: long;
    vertices: GraphVertex[];
}
export interface IlmActions {
    allocate?: IlmAllocateAction;
    delete?: IlmDeleteAction;
    downsample?: IlmDownsampleAction;
    freeze?: EmptyObject;
    forcemerge?: IlmForceMergeAction;
    migrate?: IlmMigrateAction;
    readonly?: EmptyObject;
    rollover?: IlmRolloverAction;
    set_priority?: IlmSetPriorityAction;
    searchable_snapshot?: IlmSearchableSnapshotAction;
    shrink?: IlmShrinkAction;
    unfollow?: EmptyObject;
    wait_for_snapshot?: IlmWaitForSnapshotAction;
}
export interface IlmAllocateAction {
    number_of_replicas?: integer;
    total_shards_per_node?: integer;
    include?: Record<string, string>;
    exclude?: Record<string, string>;
    require?: Record<string, string>;
}
export interface IlmDeleteAction {
    delete_searchable_snapshot?: boolean;
}
export interface IlmDownsampleAction {
    fixed_interval: DurationLarge;

}
export interface IlmForceMergeAction {
    max_num_segments: integer;
    index_codec?: string;
}
export interface IlmMigrateAction {
    enabled?: boolean;
}
export interface IlmPhase {
    actions?: IlmActions;
    min_age?: Duration | long;
}
export interface IlmPhases {
    cold?: IlmPhase;
    delete?: IlmPhase;
    frozen?: IlmPhase;
    hot?: IlmPhase;
    warm?: IlmPhase;
}
export interface IlmPolicy {
    phases: IlmPhases;
    _meta?: Metadata;
}
export interface IlmRolloverAction {
    max_size?: ByteSize;
    max_primary_shard_size?: ByteSize;
    max_age?: Duration;
    max_docs?: long;
    max_primary_shard_docs?: long;
    min_size?: ByteSize;
    min_primary_shard_size?: ByteSize;
    min_age?: Duration;
    min_docs?: long;
    min_primary_shard_docs?: long;
}
export interface IlmSearchableSnapshotAction {
    snapshot_repository: string;
    force_merge_index?: boolean;
}
export interface IlmSetPriorityAction {
    priority?: integer;
}
export interface IlmShrinkAction {
    number_of_shards?: integer;
    max_primary_shard_size?: ByteSize;
    allow_write_after_shrink?: boolean;
}
export interface IlmWaitForSnapshotAction {
    policy: string;
}
export interface IlmDeleteLifecycleRequest extends RequestBase {
    name: Name;


}
export type IlmDeleteLifecycleResponse = AcknowledgedResponseBase;
export type IlmExplainLifecycleLifecycleExplain = IlmExplainLifecycleLifecycleExplainManaged | IlmExplainLifecycleLifecycleExplainUnmanaged;
export interface IlmExplainLifecycleLifecycleExplainManaged {
    action?: Name;
    action_time?: DateTime;
    action_time_millis?: EpochTime<UnitMillis>;
    age?: Duration;
    failed_step?: Name;
    failed_step_retry_count?: integer;
    index?: IndexName;
    index_creation_date?: DateTime;
    index_creation_date_millis?: EpochTime<UnitMillis>;
    is_auto_retryable_error?: boolean;
    lifecycle_date?: DateTime;
    lifecycle_date_millis?: EpochTime<UnitMillis>;
    managed: true;
    phase: Name;
    phase_time?: DateTime;
    phase_time_millis?: EpochTime<UnitMillis>;
    policy: Name;
    step?: Name;
    step_info?: Record<string, any>;
    step_time?: DateTime;
    step_time_millis?: EpochTime<UnitMillis>;
    phase_execution?: IlmExplainLifecycleLifecycleExplainPhaseExecution;
    time_since_index_creation?: Duration;
}
export interface IlmExplainLifecycleLifecycleExplainPhaseExecution {
    policy: Name;
    version: VersionNumber;
    modified_date_in_millis: EpochTime<UnitMillis>;
}
export interface IlmExplainLifecycleLifecycleExplainUnmanaged {
    index: IndexName;
    managed: false;
}
export interface IlmExplainLifecycleRequest extends RequestBase {
    index: IndexName;
    only_errors?: boolean;
    only_managed?: boolean;


}
export interface IlmExplainLifecycleResponse {
    indices: Record<IndexName, IlmExplainLifecycleLifecycleExplain>;
}
export interface IlmGetLifecycleLifecycle {
    modified_date: DateTime;
    policy: IlmPolicy;
    version: VersionNumber;
}
export interface IlmGetLifecycleRequest extends RequestBase {
    name?: Name;


}
export type IlmGetLifecycleResponse = Record<string, IlmGetLifecycleLifecycle>;
export interface IlmGetStatusRequest extends RequestBase {
}
export interface IlmGetStatusResponse {
    operation_mode: LifecycleOperationMode;
}
export interface IlmMigrateToDataTiersRequest extends RequestBase {
    dry_run?: boolean;
    legacy_template_to_delete?: string;
    node_attribute?: string;
}
export interface IlmMigrateToDataTiersResponse {
    dry_run: boolean;
    removed_legacy_template: string;
    migrated_ilm_policies: string[];
    migrated_indices: Indices;
    migrated_legacy_templates: string[];
    migrated_composable_templates: string[];
    migrated_component_templates: string[];
}
export interface IlmMoveToStepRequest extends RequestBase {
    index: IndexName;
    current_step?: IlmMoveToStepStepKey;
    next_step?: IlmMoveToStepStepKey;
}
export type IlmMoveToStepResponse = AcknowledgedResponseBase;
export interface IlmMoveToStepStepKey {
    action: string;
    name: string;
    phase: string;
}
export interface IlmPutLifecycleRequest extends RequestBase {
    name: Name;


    policy?: IlmPolicy;
}
export type IlmPutLifecycleResponse = AcknowledgedResponseBase;
export interface IlmRemovePolicyRequest extends RequestBase {
    index: IndexName;
}
export interface IlmRemovePolicyResponse {
    failed_indexes: IndexName[];
    has_failures: boolean;
}
export interface IlmRetryRequest extends RequestBase {
    index: IndexName;
}
export type IlmRetryResponse = AcknowledgedResponseBase;
export interface IlmStartRequest extends RequestBase {


}
export type IlmStartResponse = AcknowledgedResponseBase;
export interface IlmStopRequest extends RequestBase {


}
export type IlmStopResponse = AcknowledgedResponseBase;
export interface IndicesAlias {
    filter?: QueryDslQueryContainer;
    index_routing?: Routing;
    is_hidden?: boolean;
    is_write_index?: boolean;
    routing?: Routing;
    search_routing?: Routing;
}
export interface IndicesAliasDefinition {
    filter?: QueryDslQueryContainer;
    index_routing?: string;
    is_write_index?: boolean;
    routing?: string;
    search_routing?: string;
    is_hidden?: boolean;
}
export interface IndicesCacheQueries {
    enabled: boolean;
}
export interface IndicesDataStream {
    _meta?: Metadata;
    allow_custom_routing?: boolean;
    generation: integer;
    hidden: boolean;
    ilm_policy?: Name;
    next_generation_managed_by: IndicesManagedBy;
    prefer_ilm: boolean;
    indices: IndicesDataStreamIndex[];
    lifecycle?: IndicesDataStreamLifecycleWithRollover;
    name: DataStreamName;
    replicated?: boolean;
    status: HealthStatus;
    system?: boolean;
    template: Name;
    timestamp_field: IndicesDataStreamTimestampField;
}
export interface IndicesDataStreamIndex {
    index_name: IndexName;
    index_uuid: Uuid;
    ilm_policy?: Name;
    managed_by: IndicesManagedBy;
    prefer_ilm: boolean;
}
export interface IndicesDataStreamLifecycle {
    data_retention?: Duration;
    downsampling?: IndicesDataStreamLifecycleDownsampling;
}
export interface IndicesDataStreamLifecycleDownsampling {
    rounds: IndicesDownsamplingRound[];
}
export interface IndicesDataStreamLifecycleRolloverConditions {
    min_age?: Duration;
    max_age?: string;
    min_docs?: long;
    max_docs?: long;
    min_size?: ByteSize;
    max_size?: ByteSize;
    min_primary_shard_size?: ByteSize;
    max_primary_shard_size?: ByteSize;
    min_primary_shard_docs?: long;
    max_primary_shard_docs?: long;
}
export interface IndicesDataStreamLifecycleWithRollover {
    data_retention?: Duration;
    downsampling?: IndicesDataStreamLifecycleDownsampling;
    rollover?: IndicesDataStreamLifecycleRolloverConditions;
}
export interface IndicesDataStreamTimestampField {
    name: Field;
}
export interface IndicesDataStreamVisibility {
    hidden?: boolean;
}
export interface IndicesDownsampleConfig {
    fixed_interval: DurationLarge;
}
export interface IndicesDownsamplingRound {
    after: Duration;
    config: IndicesDownsampleConfig;
}
export interface IndicesFielddataFrequencyFilter {
    max: double;
    min: double;
    min_segment_size: integer;
}
export type IndicesIndexCheckOnStartup = boolean | 'true' | 'false' | 'checksum';
export interface IndicesIndexRouting {
    allocation?: IndicesIndexRoutingAllocation;
    rebalance?: IndicesIndexRoutingRebalance;
}
export interface IndicesIndexRoutingAllocation {
    enable?: IndicesIndexRoutingAllocationOptions;
    include?: IndicesIndexRoutingAllocationInclude;
    initial_recovery?: IndicesIndexRoutingAllocationInitialRecovery;
    disk?: IndicesIndexRoutingAllocationDisk;
}
export interface IndicesIndexRoutingAllocationDisk {
    threshold_enabled?: boolean | string;
}
export interface IndicesIndexRoutingAllocationInclude {
    _tier_preference?: string;
    _id?: Id;
}
export interface IndicesIndexRoutingAllocationInitialRecovery {
    _id?: Id;
}
export type IndicesIndexRoutingAllocationOptions = 'all' | 'primaries' | 'new_primaries' | 'none';
export interface IndicesIndexRoutingRebalance {
    enable: IndicesIndexRoutingRebalanceOptions;
}
export type IndicesIndexRoutingRebalanceOptions = 'all' | 'primaries' | 'replicas' | 'none';
export interface IndicesIndexSegmentSort {
    field?: Fields;
    order?: IndicesSegmentSortOrder | IndicesSegmentSortOrder[];
    mode?: IndicesSegmentSortMode | IndicesSegmentSortMode[];
    missing?: IndicesSegmentSortMissing | IndicesSegmentSortMissing[];
}
export interface IndicesIndexSettingBlocks {
    read_only?: SpecUtilsStringified<boolean>;
    read_only_allow_delete?: SpecUtilsStringified<boolean>;
    read?: SpecUtilsStringified<boolean>;
    write?: SpecUtilsStringified<boolean>;
    metadata?: SpecUtilsStringified<boolean>;
}
export interface IndicesIndexSettingsKeys {
    index?: IndicesIndexSettings;
    mode?: string;
    routing_path?: string | string[];
    soft_deletes?: IndicesSoftDeletes;
    sort?: IndicesIndexSegmentSort;
    number_of_shards?: integer | string;
    number_of_replicas?: integer | string;
    number_of_routing_shards?: integer;
    check_on_startup?: IndicesIndexCheckOnStartup;
    codec?: string;
    routing_partition_size?: SpecUtilsStringified<integer>;
    load_fixed_bitset_filters_eagerly?: boolean;
    hidden?: boolean | string;
    auto_expand_replicas?: string;
    merge?: IndicesMerge;
    search?: IndicesSettingsSearch;
    refresh_interval?: Duration;
    max_result_window?: integer;
    max_inner_result_window?: integer;
    max_rescore_window?: integer;
    max_docvalue_fields_search?: integer;
    max_script_fields?: integer;
    max_ngram_diff?: integer;
    max_shingle_diff?: integer;
    blocks?: IndicesIndexSettingBlocks;
    max_refresh_listeners?: integer;
    analyze?: IndicesSettingsAnalyze;
    highlight?: IndicesSettingsHighlight;
    max_terms_count?: integer;
    max_regex_length?: integer;
    routing?: IndicesIndexRouting;
    gc_deletes?: Duration;
    default_pipeline?: PipelineName;
    final_pipeline?: PipelineName;
    lifecycle?: IndicesIndexSettingsLifecycle;
    provided_name?: Name;
    creation_date?: SpecUtilsStringified<EpochTime<UnitMillis>>;
    creation_date_string?: DateTime;
    uuid?: Uuid;
    version?: IndicesIndexVersioning;
    verified_before_close?: boolean | string;
    format?: string | integer;
    max_slices_per_scroll?: integer;
    translog?: IndicesTranslog;
    query_string?: IndicesSettingsQueryString;
    priority?: integer | string;
    top_metrics_max_size?: integer;
    analysis?: IndicesIndexSettingsAnalysis;
    settings?: IndicesIndexSettings;
    time_series?: IndicesIndexSettingsTimeSeries;
    queries?: IndicesQueries;
    similarity?: Record<string, IndicesSettingsSimilarity>;
    mapping?: IndicesMappingLimitSettings;
    'indexing.slowlog'?: IndicesIndexingSlowlogSettings;
    indexing_pressure?: IndicesIndexingPressure;
    store?: IndicesStorage;
}
export type IndicesIndexSettings = IndicesIndexSettingsKeys & {
    [property: string]: any;
};
export interface IndicesIndexSettingsAnalysis {
    analyzer?: Record<string, AnalysisAnalyzer>;
    char_filter?: Record<string, AnalysisCharFilter>;
    filter?: Record<string, AnalysisTokenFilter>;
    normalizer?: Record<string, AnalysisNormalizer>;
    tokenizer?: Record<string, AnalysisTokenizer>;
}
export interface IndicesIndexSettingsLifecycle {
    name?: Name;
    indexing_complete?: SpecUtilsStringified<boolean>;
    origination_date?: long;
    parse_origination_date?: boolean;
    step?: IndicesIndexSettingsLifecycleStep;
    rollover_alias?: string;
}
export interface IndicesIndexSettingsLifecycleStep {
    wait_time_threshold?: Duration;
}
export interface IndicesIndexSettingsTimeSeries {
    end_time?: DateTime;
    start_time?: DateTime;
}
export interface IndicesIndexState {
    aliases?: Record<IndexName, IndicesAlias>;
    mappings?: MappingTypeMapping;
    settings?: IndicesIndexSettings;
    defaults?: IndicesIndexSettings;
    data_stream?: DataStreamName;
    lifecycle?: IndicesDataStreamLifecycle;
}
export interface IndicesIndexTemplate {
    index_patterns: Names;
    composed_of: Name[];
    template?: IndicesIndexTemplateSummary;
    version?: VersionNumber;
    priority?: long;
    _meta?: Metadata;
    allow_auto_create?: boolean;
    data_stream?: IndicesIndexTemplateDataStreamConfiguration;
}
export interface IndicesIndexTemplateDataStreamConfiguration {
    hidden?: boolean;
    allow_custom_routing?: boolean;
}
export interface IndicesIndexTemplateSummary {
    aliases?: Record<IndexName, IndicesAlias>;
    mappings?: MappingTypeMapping;
    settings?: IndicesIndexSettings;
    lifecycle?: IndicesDataStreamLifecycleWithRollover;
}
export interface IndicesIndexVersioning {
    created?: VersionString;
    created_string?: string;
}
export interface IndicesIndexingPressure {
    memory: IndicesIndexingPressureMemory;
}
export interface IndicesIndexingPressureMemory {
    limit?: integer;
}
export interface IndicesIndexingSlowlogSettings {
    level?: string;
    source?: integer;
    reformat?: boolean;
    threshold?: IndicesIndexingSlowlogTresholds;
}
export interface IndicesIndexingSlowlogTresholds {
    index?: IndicesSlowlogTresholdLevels;
}
export type IndicesManagedBy = 'Index Lifecycle Management' | 'Data stream lifecycle' | 'Unmanaged';
export interface IndicesMappingLimitSettings {
    coerce?: boolean;
    total_fields?: IndicesMappingLimitSettingsTotalFields;
    depth?: IndicesMappingLimitSettingsDepth;
    nested_fields?: IndicesMappingLimitSettingsNestedFields;
    nested_objects?: IndicesMappingLimitSettingsNestedObjects;
    field_name_length?: IndicesMappingLimitSettingsFieldNameLength;
    dimension_fields?: IndicesMappingLimitSettingsDimensionFields;
    ignore_malformed?: boolean;
}
export interface IndicesMappingLimitSettingsDepth {
    limit?: long;
}
export interface IndicesMappingLimitSettingsDimensionFields {
    limit?: long;
}
export interface IndicesMappingLimitSettingsFieldNameLength {
    limit?: long;
}
export interface IndicesMappingLimitSettingsNestedFields {
    limit?: long;
}
export interface IndicesMappingLimitSettingsNestedObjects {
    limit?: long;
}
export interface IndicesMappingLimitSettingsTotalFields {
    limit?: long;
    ignore_dynamic_beyond_limit?: boolean;
}
export interface IndicesMerge {
    scheduler?: IndicesMergeScheduler;
}
export interface IndicesMergeScheduler {
    max_thread_count?: SpecUtilsStringified<integer>;
    max_merge_count?: SpecUtilsStringified<integer>;
}
export interface IndicesNumericFielddata {
    format: IndicesNumericFielddataFormat;
}
export type IndicesNumericFielddataFormat = 'array' | 'disabled';
export interface IndicesQueries {
    cache?: IndicesCacheQueries;
}
export interface IndicesRetentionLease {
    period: Duration;
}
export interface IndicesSearchIdle {
    after?: Duration;
}
export type IndicesSegmentSortMissing = '_last' | '_first';
export type IndicesSegmentSortMode = 'min' | 'MIN' | 'max' | 'MAX';
export type IndicesSegmentSortOrder = 'asc' | 'ASC' | 'desc' | 'DESC';
export interface IndicesSettingsAnalyze {
    max_token_count?: SpecUtilsStringified<integer>;
}
export interface IndicesSettingsHighlight {
    max_analyzed_offset?: integer;
}
export interface IndicesSettingsQueryString {
    lenient: SpecUtilsStringified<boolean>;
}
export interface IndicesSettingsSearch {
    idle?: IndicesSearchIdle;
    slowlog?: IndicesSlowlogSettings;
}
export type IndicesSettingsSimilarity = IndicesSettingsSimilarityBm25 | IndicesSettingsSimilarityBoolean | IndicesSettingsSimilarityDfi | IndicesSettingsSimilarityDfr | IndicesSettingsSimilarityIb | IndicesSettingsSimilarityLmd | IndicesSettingsSimilarityLmj | IndicesSettingsSimilarityScripted;
export interface IndicesSettingsSimilarityBm25 {
    type: 'BM25';
    b?: double;
    discount_overlaps?: boolean;
    k1?: double;
}
export interface IndicesSettingsSimilarityBoolean {
    type: 'boolean';
}
export interface IndicesSettingsSimilarityDfi {
    type: 'DFI';
    independence_measure: DFIIndependenceMeasure;
}
export interface IndicesSettingsSimilarityDfr {
    type: 'DFR';
    after_effect: DFRAfterEffect;
    basic_model: DFRBasicModel;
    normalization: Normalization;
}
export interface IndicesSettingsSimilarityIb {
    type: 'IB';
    distribution: IBDistribution;
    lambda: IBLambda;
    normalization: Normalization;
}
export interface IndicesSettingsSimilarityLmd {
    type: 'LMDirichlet';
    mu?: double;
}
export interface IndicesSettingsSimilarityLmj {
    type: 'LMJelinekMercer';
    lambda?: double;
}
export interface IndicesSettingsSimilarityScripted {
    type: 'scripted';
    script: Script | string;
    weight_script?: Script | string;
}
export interface IndicesSlowlogSettings {
    level?: string;
    source?: integer;
    reformat?: boolean;
    threshold?: IndicesSlowlogTresholds;
}
export interface IndicesSlowlogTresholdLevels {
    warn?: Duration;
    info?: Duration;
    debug?: Duration;
    trace?: Duration;
}
export interface IndicesSlowlogTresholds {
    query?: IndicesSlowlogTresholdLevels;
    fetch?: IndicesSlowlogTresholdLevels;
}
export interface IndicesSoftDeletes {
    enabled?: boolean;
    retention_lease?: IndicesRetentionLease;
}
export interface IndicesStorage {
    type: IndicesStorageType;
    allow_mmap?: boolean;
}
export type IndicesStorageType = 'fs' | 'niofs' | 'mmapfs' | 'hybridfs' | string;
export interface IndicesTemplateMapping {
    aliases: Record<IndexName, IndicesAlias>;
    index_patterns: Name[];
    mappings: MappingTypeMapping;
    order: integer;
    settings: Record<string, any>;
    version?: VersionNumber;
}
export interface IndicesTranslog {
    sync_interval?: Duration;
    durability?: IndicesTranslogDurability;
    flush_threshold_size?: ByteSize;
    retention?: IndicesTranslogRetention;
}
export type IndicesTranslogDurability = 'request' | 'REQUEST' | 'async' | 'ASYNC';
export interface IndicesTranslogRetention {
    size?: ByteSize;
    age?: Duration;
}
export type IndicesAddBlockIndicesBlockOptions = 'metadata' | 'read' | 'read_only' | 'write';
export interface IndicesAddBlockIndicesBlockStatus {
    name: IndexName;
    blocked: boolean;
}
export interface IndicesAddBlockRequest extends RequestBase {
    index: IndexName;
    block: IndicesAddBlockIndicesBlockOptions;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


}
export interface IndicesAddBlockResponse {
    acknowledged: boolean;
    shards_acknowledged: boolean;
    indices: IndicesAddBlockIndicesBlockStatus[];
}
export interface IndicesAnalyzeAnalyzeDetail {
    analyzer?: IndicesAnalyzeAnalyzerDetail;
    charfilters?: IndicesAnalyzeCharFilterDetail[];
    custom_analyzer: boolean;
    tokenfilters?: IndicesAnalyzeTokenDetail[];
    tokenizer?: IndicesAnalyzeTokenDetail;
}
export interface IndicesAnalyzeAnalyzeToken {
    end_offset: long;
    position: long;
    positionLength?: long;
    start_offset: long;
    token: string;
    type: string;
}
export interface IndicesAnalyzeAnalyzerDetail {
    name: string;
    tokens: IndicesAnalyzeExplainAnalyzeToken[];
}
export interface IndicesAnalyzeCharFilterDetail {
    filtered_text: string[];
    name: string;
}
export interface IndicesAnalyzeExplainAnalyzeTokenKeys {
    bytes: string;
    end_offset: long;
    keyword?: boolean;
    position: long;
    positionLength: long;
    start_offset: long;
    termFrequency: long;
    token: string;
    type: string;
}
export type IndicesAnalyzeExplainAnalyzeToken = IndicesAnalyzeExplainAnalyzeTokenKeys & {
    [property: string]: any;
};
export interface IndicesAnalyzeRequest extends RequestBase {
    index?: IndexName;
    analyzer?: string;
    attributes?: string[];
    char_filter?: AnalysisCharFilter[];
    explain?: boolean;
    field?: Field;
    filter?: AnalysisTokenFilter[];
    normalizer?: string;
    text?: IndicesAnalyzeTextToAnalyze;
    tokenizer?: AnalysisTokenizer;
}
export interface IndicesAnalyzeResponse {
    detail?: IndicesAnalyzeAnalyzeDetail;
    tokens?: IndicesAnalyzeAnalyzeToken[];
}
export type IndicesAnalyzeTextToAnalyze = string | string[];
export interface IndicesAnalyzeTokenDetail {
    name: string;
    tokens: IndicesAnalyzeExplainAnalyzeToken[];
}
export interface IndicesClearCacheRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    fielddata?: boolean;
    fields?: Fields;
    ignore_unavailable?: boolean;
    query?: boolean;
    request?: boolean;
}
export type IndicesClearCacheResponse = ShardsOperationResponseBase;
export interface IndicesCloneRequest extends RequestBase {
    index: IndexName;
    target: Name;


    wait_for_active_shards?: WaitForActiveShards;
    aliases?: Record<IndexName, IndicesAlias>;
    settings?: Record<string, any>;
}
export interface IndicesCloneResponse {
    acknowledged: boolean;
    index: IndexName;
    shards_acknowledged: boolean;
}
export interface IndicesCloseCloseIndexResult {
    closed: boolean;
    shards?: Record<string, IndicesCloseCloseShardResult>;
}
export interface IndicesCloseCloseShardResult {
    failures: ShardFailure[];
}
export interface IndicesCloseRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


    wait_for_active_shards?: WaitForActiveShards;
}
export interface IndicesCloseResponse {
    acknowledged: boolean;
    indices: Record<IndexName, IndicesCloseCloseIndexResult>;
    shards_acknowledged: boolean;
}
export interface IndicesCreateRequest extends RequestBase {
    index: IndexName;


    wait_for_active_shards?: WaitForActiveShards;
    aliases?: Record<Name, IndicesAlias>;
    mappings?: MappingTypeMapping;
    settings?: IndicesIndexSettings;
}
export interface IndicesCreateResponse {
    index: IndexName;
    shards_acknowledged: boolean;
    acknowledged: boolean;
}
export interface IndicesCreateDataStreamRequest extends RequestBase {
    name: DataStreamName;
}
export type IndicesCreateDataStreamResponse = AcknowledgedResponseBase;
export interface IndicesDataStreamsStatsDataStreamsStatsItem {
    backing_indices: integer;
    data_stream: Name;
    maximum_timestamp: EpochTime<UnitMillis>;
    store_size?: ByteSize;
    store_size_bytes: long;
}
export interface IndicesDataStreamsStatsRequest extends RequestBase {
    name?: IndexName;
    expand_wildcards?: ExpandWildcards;
}
export interface IndicesDataStreamsStatsResponse {
    _shards: ShardStatistics;
    backing_indices: integer;
    data_stream_count: integer;
    data_streams: IndicesDataStreamsStatsDataStreamsStatsItem[];
    total_store_sizes?: ByteSize;
    total_store_size_bytes: long;
}
export interface IndicesDeleteRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


}
export type IndicesDeleteResponse = IndicesResponseBase;
export interface IndicesDeleteAliasRequest extends RequestBase {
    index: Indices;
    name: Names;


}
export type IndicesDeleteAliasResponse = AcknowledgedResponseBase;
export interface IndicesDeleteDataLifecycleRequest extends RequestBase {
    name: DataStreamNames;
    expand_wildcards?: ExpandWildcards;


}
export type IndicesDeleteDataLifecycleResponse = AcknowledgedResponseBase;
export interface IndicesDeleteDataStreamRequest extends RequestBase {
    name: DataStreamNames;
    expand_wildcards?: ExpandWildcards;
}
export type IndicesDeleteDataStreamResponse = AcknowledgedResponseBase;
export interface IndicesDeleteIndexTemplateRequest extends RequestBase {
    name: Names;


}
export type IndicesDeleteIndexTemplateResponse = AcknowledgedResponseBase;
export interface IndicesDeleteTemplateRequest extends RequestBase {
    name: Name;


}
export type IndicesDeleteTemplateResponse = AcknowledgedResponseBase;
export interface IndicesDiskUsageRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flush?: boolean;
    ignore_unavailable?: boolean;
    run_expensive_tasks?: boolean;
}
export type IndicesDiskUsageResponse = any;
export interface IndicesDownsampleRequest extends RequestBase {
    index: IndexName;
    target_index: IndexName;
    config?: IndicesDownsampleConfig;
}
export type IndicesDownsampleResponse = any;
export interface IndicesExistsRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flat_settings?: boolean;
    ignore_unavailable?: boolean;
    include_defaults?: boolean;
    local?: boolean;
}
export type IndicesExistsResponse = boolean;
export interface IndicesExistsAliasRequest extends RequestBase {
    name: Names;
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    local?: boolean;
}
export type IndicesExistsAliasResponse = boolean;
export interface IndicesExistsIndexTemplateRequest extends RequestBase {
    name: Name;

}
export type IndicesExistsIndexTemplateResponse = boolean;
export interface IndicesExistsTemplateRequest extends RequestBase {
    name: Names;
    flat_settings?: boolean;
    local?: boolean;

}
export type IndicesExistsTemplateResponse = boolean;
export interface IndicesExplainDataLifecycleDataStreamLifecycleExplain {
    index: IndexName;
    managed_by_lifecycle: boolean;
    index_creation_date_millis?: EpochTime<UnitMillis>;
    time_since_index_creation?: Duration;
    rollover_date_millis?: EpochTime<UnitMillis>;
    time_since_rollover?: Duration;
    lifecycle?: IndicesDataStreamLifecycleWithRollover;
    generation_time?: Duration;
    error?: string;
}
export interface IndicesExplainDataLifecycleRequest extends RequestBase {
    index: Indices;
    include_defaults?: boolean;

}
export interface IndicesExplainDataLifecycleResponse {
    indices: Record<IndexName, IndicesExplainDataLifecycleDataStreamLifecycleExplain>;
}
export interface IndicesFieldUsageStatsFieldSummary {
    any: uint;
    stored_fields: uint;
    doc_values: uint;
    points: uint;
    norms: uint;
    term_vectors: uint;
    knn_vectors: uint;
    inverted_index: IndicesFieldUsageStatsInvertedIndex;
}
export interface IndicesFieldUsageStatsFieldsUsageBodyKeys {
    _shards: ShardStatistics;
}
export type IndicesFieldUsageStatsFieldsUsageBody = IndicesFieldUsageStatsFieldsUsageBodyKeys & {
    [property: string]: IndicesFieldUsageStatsUsageStatsIndex | ShardStatistics;
};
export interface IndicesFieldUsageStatsInvertedIndex {
    terms: uint;
    postings: uint;
    proximity: uint;
    positions: uint;
    term_frequencies: uint;
    offsets: uint;
    payloads: uint;
}
export interface IndicesFieldUsageStatsRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    fields?: Fields;


    wait_for_active_shards?: WaitForActiveShards;
}
export type IndicesFieldUsageStatsResponse = IndicesFieldUsageStatsFieldsUsageBody;
export interface IndicesFieldUsageStatsShardsStats {
    all_fields: IndicesFieldUsageStatsFieldSummary;
    fields: Record<Field, IndicesFieldUsageStatsFieldSummary>;
}
export interface IndicesFieldUsageStatsUsageStatsIndex {
    shards: IndicesFieldUsageStatsUsageStatsShards[];
}
export interface IndicesFieldUsageStatsUsageStatsShards {
    routing: IndicesStatsShardRouting;
    stats: IndicesFieldUsageStatsShardsStats;
    tracking_id: string;
    tracking_started_at_millis: EpochTime<UnitMillis>;
}
export interface IndicesFlushRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    force?: boolean;
    ignore_unavailable?: boolean;
    wait_if_ongoing?: boolean;
}
export type IndicesFlushResponse = ShardsOperationResponseBase;
export interface IndicesForcemergeRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flush?: boolean;
    ignore_unavailable?: boolean;
    max_num_segments?: long;
    only_expunge_deletes?: boolean;
    wait_for_completion?: boolean;
}
export type IndicesForcemergeResponse = IndicesForcemergeForceMergeResponseBody;
export interface IndicesForcemergeForceMergeResponseBody extends ShardsOperationResponseBase {
    task?: string;
}
export type IndicesGetFeature = 'aliases' | 'mappings' | 'settings';
export type IndicesGetFeatures = IndicesGetFeature | IndicesGetFeature[];
export interface IndicesGetRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flat_settings?: boolean;
    ignore_unavailable?: boolean;
    include_defaults?: boolean;
    local?: boolean;

    features?: IndicesGetFeatures;
}
export type IndicesGetResponse = Record<IndexName, IndicesIndexState>;
export interface IndicesGetAliasIndexAliases {
    aliases: Record<string, IndicesAliasDefinition>;
}
export interface IndicesGetAliasRequest extends RequestBase {
    name?: Names;
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    local?: boolean;
}
export type IndicesGetAliasResponse = Record<IndexName, IndicesGetAliasIndexAliases>;
export interface IndicesGetDataLifecycleDataStreamWithLifecycle {
    name: DataStreamName;
    lifecycle?: IndicesDataStreamLifecycle;
}
export interface IndicesGetDataLifecycleRequest extends RequestBase {
    name: DataStreamNames;
    expand_wildcards?: ExpandWildcards;
    include_defaults?: boolean;
}
export interface IndicesGetDataLifecycleResponse {
    data_streams: IndicesGetDataLifecycleDataStreamWithLifecycle[];
}
export interface IndicesGetDataStreamRequest extends RequestBase {
    name?: DataStreamNames;
    expand_wildcards?: ExpandWildcards;
    include_defaults?: boolean;
}
export interface IndicesGetDataStreamResponse {
    data_streams: IndicesDataStream[];
}
export interface IndicesGetFieldMappingRequest extends RequestBase {
    fields: Fields;
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    include_defaults?: boolean;
    local?: boolean;
}
export type IndicesGetFieldMappingResponse = Record<IndexName, IndicesGetFieldMappingTypeFieldMappings>;
export interface IndicesGetFieldMappingTypeFieldMappings {
    mappings: Record<Field, MappingFieldMapping>;
}
export interface IndicesGetIndexTemplateIndexTemplateItem {
    name: Name;
    index_template: IndicesIndexTemplate;
}
export interface IndicesGetIndexTemplateRequest extends RequestBase {
    name?: Name;
    local?: boolean;
    flat_settings?: boolean;

    include_defaults?: boolean;
}
export interface IndicesGetIndexTemplateResponse {
    index_templates: IndicesGetIndexTemplateIndexTemplateItem[];
}
export interface IndicesGetMappingIndexMappingRecord {
    item?: MappingTypeMapping;
    mappings: MappingTypeMapping;
}
export interface IndicesGetMappingRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    local?: boolean;

}
export type IndicesGetMappingResponse = Record<IndexName, IndicesGetMappingIndexMappingRecord>;
export interface IndicesGetSettingsRequest extends RequestBase {
    index?: Indices;
    name?: Names;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flat_settings?: boolean;
    ignore_unavailable?: boolean;
    include_defaults?: boolean;
    local?: boolean;

}
export type IndicesGetSettingsResponse = Record<IndexName, IndicesIndexState>;
export interface IndicesGetTemplateRequest extends RequestBase {
    name?: Names;
    flat_settings?: boolean;
    local?: boolean;

}
export type IndicesGetTemplateResponse = Record<string, IndicesTemplateMapping>;
export interface IndicesMigrateToDataStreamRequest extends RequestBase {
    name: IndexName;
}
export type IndicesMigrateToDataStreamResponse = AcknowledgedResponseBase;
export interface IndicesModifyDataStreamAction {
    add_backing_index?: IndicesModifyDataStreamIndexAndDataStreamAction;
    remove_backing_index?: IndicesModifyDataStreamIndexAndDataStreamAction;
}
export interface IndicesModifyDataStreamIndexAndDataStreamAction {
    data_stream: DataStreamName;
    index: IndexName;
}
export interface IndicesModifyDataStreamRequest extends RequestBase {
    actions: IndicesModifyDataStreamAction[];
}
export type IndicesModifyDataStreamResponse = AcknowledgedResponseBase;
export interface IndicesOpenRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


    wait_for_active_shards?: WaitForActiveShards;
}
export interface IndicesOpenResponse {
    acknowledged: boolean;
    shards_acknowledged: boolean;
}
export interface IndicesPromoteDataStreamRequest extends RequestBase {
    name: IndexName;
}
export type IndicesPromoteDataStreamResponse = any;
export interface IndicesPutAliasRequest extends RequestBase {
    index: Indices;
    name: Name;


    filter?: QueryDslQueryContainer;
    index_routing?: Routing;
    is_write_index?: boolean;
    routing?: Routing;
    search_routing?: Routing;
}
export type IndicesPutAliasResponse = AcknowledgedResponseBase;
export interface IndicesPutDataLifecycleRequest extends RequestBase {
    name: DataStreamNames;
    expand_wildcards?: ExpandWildcards;


    data_retention?: Duration;
    downsampling?: IndicesDataStreamLifecycleDownsampling;
}
export type IndicesPutDataLifecycleResponse = AcknowledgedResponseBase;
export interface IndicesPutIndexTemplateIndexTemplateMapping {
    aliases?: Record<IndexName, IndicesAlias>;
    mappings?: MappingTypeMapping;
    settings?: IndicesIndexSettings;
    lifecycle?: IndicesDataStreamLifecycle;
}
export interface IndicesPutIndexTemplateRequest extends RequestBase {
    name: Name;
    create?: boolean;

    cause?: string;
    index_patterns?: Indices;
    composed_of?: Name[];
    template?: IndicesPutIndexTemplateIndexTemplateMapping;
    data_stream?: IndicesDataStreamVisibility;
    priority?: long;
    version?: VersionNumber;
    _meta?: Metadata;
    allow_auto_create?: boolean;
    ignore_missing_component_templates?: string[];
    deprecated?: boolean;
}
export type IndicesPutIndexTemplateResponse = AcknowledgedResponseBase;
export interface IndicesPutMappingRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


    write_index_only?: boolean;
    date_detection?: boolean;
    dynamic?: MappingDynamicMapping;
    dynamic_date_formats?: string[];
    dynamic_templates?: Record<string, MappingDynamicTemplate> | Record<string, MappingDynamicTemplate>[];
    _field_names?: MappingFieldNamesField;
    _meta?: Metadata;
    numeric_detection?: boolean;
    properties?: Record<PropertyName, MappingProperty>;
    _routing?: MappingRoutingField;
    _source?: MappingSourceField;
    runtime?: MappingRuntimeFields;
}
export type IndicesPutMappingResponse = IndicesResponseBase;
export interface IndicesPutSettingsRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    flat_settings?: boolean;
    ignore_unavailable?: boolean;

    preserve_existing?: boolean;

    settings?: IndicesIndexSettings;
}
export type IndicesPutSettingsResponse = AcknowledgedResponseBase;
export interface IndicesPutTemplateRequest extends RequestBase {
    name: Name;
    create?: boolean;

    cause?: string;
    aliases?: Record<IndexName, IndicesAlias>;
    index_patterns?: string | string[];
    mappings?: MappingTypeMapping;
    order?: integer;
    settings?: IndicesIndexSettings;
    version?: VersionNumber;
}
export type IndicesPutTemplateResponse = AcknowledgedResponseBase;
export interface IndicesRecoveryFileDetails {
    length: long;
    name: string;
    recovered: long;
}
export interface IndicesRecoveryRecoveryBytes {
    percent: Percentage;
    recovered?: ByteSize;
    recovered_in_bytes: ByteSize;
    recovered_from_snapshot?: ByteSize;
    recovered_from_snapshot_in_bytes?: ByteSize;
    reused?: ByteSize;
    reused_in_bytes: ByteSize;
    total?: ByteSize;
    total_in_bytes: ByteSize;
}
export interface IndicesRecoveryRecoveryFiles {
    details?: IndicesRecoveryFileDetails[];
    percent: Percentage;
    recovered: long;
    reused: long;
    total: long;
}
export interface IndicesRecoveryRecoveryIndexStatus {
    bytes?: IndicesRecoveryRecoveryBytes;
    files: IndicesRecoveryRecoveryFiles;
    size: IndicesRecoveryRecoveryBytes;
    source_throttle_time?: Duration;
    source_throttle_time_in_millis: DurationValue<UnitMillis>;
    target_throttle_time?: Duration;
    target_throttle_time_in_millis: DurationValue<UnitMillis>;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export interface IndicesRecoveryRecoveryOrigin {
    hostname?: string;
    host?: Host;
    transport_address?: TransportAddress;
    id?: Id;
    ip?: Ip;
    name?: Name;
    bootstrap_new_history_uuid?: boolean;
    repository?: Name;
    snapshot?: Name;
    version?: VersionString;
    restoreUUID?: Uuid;
    index?: IndexName;
}
export interface IndicesRecoveryRecoveryStartStatus {
    check_index_time?: Duration;
    check_index_time_in_millis: DurationValue<UnitMillis>;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export interface IndicesRecoveryRecoveryStatus {
    shards: IndicesRecoveryShardRecovery[];
}
export interface IndicesRecoveryRequest extends RequestBase {
    index?: Indices;
    active_only?: boolean;
    detailed?: boolean;
}
export type IndicesRecoveryResponse = Record<IndexName, IndicesRecoveryRecoveryStatus>;
export interface IndicesRecoveryShardRecovery {
    id: long;
    index: IndicesRecoveryRecoveryIndexStatus;
    primary: boolean;
    source: IndicesRecoveryRecoveryOrigin;
    stage: string;
    start?: IndicesRecoveryRecoveryStartStatus;
    start_time?: DateTime;
    start_time_in_millis: EpochTime<UnitMillis>;
    stop_time?: DateTime;
    stop_time_in_millis?: EpochTime<UnitMillis>;
    target: IndicesRecoveryRecoveryOrigin;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
    translog: IndicesRecoveryTranslogStatus;
    type: string;
    verify_index: IndicesRecoveryVerifyIndex;
}
export interface IndicesRecoveryTranslogStatus {
    percent: Percentage;
    recovered: long;
    total: long;
    total_on_start: long;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export interface IndicesRecoveryVerifyIndex {
    check_index_time?: Duration;
    check_index_time_in_millis: DurationValue<UnitMillis>;
    total_time?: Duration;
    total_time_in_millis: DurationValue<UnitMillis>;
}
export interface IndicesRefreshRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
}
export type IndicesRefreshResponse = ShardsOperationResponseBase;
export interface IndicesReloadSearchAnalyzersReloadDetails {
    index: string;
    reloaded_analyzers: string[];
    reloaded_node_ids: string[];
}
export interface IndicesReloadSearchAnalyzersReloadResult {
    reload_details: IndicesReloadSearchAnalyzersReloadDetails[];
    _shards: ShardStatistics;
}
export interface IndicesReloadSearchAnalyzersRequest extends RequestBase {
    index: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
}
export type IndicesReloadSearchAnalyzersResponse = IndicesReloadSearchAnalyzersReloadResult;
export interface IndicesResolveClusterRequest extends RequestBase {
    name: Names;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
}
export interface IndicesResolveClusterResolveClusterInfo {
    connected: boolean;
    skip_unavailable: boolean;
    matching_indices?: boolean;
    error?: string;
    version?: ElasticsearchVersionMinInfo;
}
export type IndicesResolveClusterResponse = Record<ClusterAlias, IndicesResolveClusterResolveClusterInfo>;
export interface IndicesResolveIndexRequest extends RequestBase {
    name: Names;
    expand_wildcards?: ExpandWildcards;
}
export interface IndicesResolveIndexResolveIndexAliasItem {
    name: Name;
    indices: Indices;
}
export interface IndicesResolveIndexResolveIndexDataStreamsItem {
    name: DataStreamName;
    timestamp_field: Field;
    backing_indices: Indices;
}
export interface IndicesResolveIndexResolveIndexItem {
    name: Name;
    aliases?: string[];
    attributes: string[];
    data_stream?: DataStreamName;
}
export interface IndicesResolveIndexResponse {
    indices: IndicesResolveIndexResolveIndexItem[];
    aliases: IndicesResolveIndexResolveIndexAliasItem[];
    data_streams: IndicesResolveIndexResolveIndexDataStreamsItem[];
}
export interface IndicesRolloverRequest extends RequestBase {
    alias: IndexAlias;
    new_index?: IndexName;
    dry_run?: boolean;


    wait_for_active_shards?: WaitForActiveShards;
    aliases?: Record<IndexName, IndicesAlias>;
    conditions?: IndicesRolloverRolloverConditions;
    mappings?: MappingTypeMapping;
    settings?: Record<string, any>;
}
export interface IndicesRolloverResponse {
    acknowledged: boolean;
    conditions: Record<string, boolean>;
    dry_run: boolean;
    new_index: string;
    old_index: string;
    rolled_over: boolean;
    shards_acknowledged: boolean;
}
export interface IndicesRolloverRolloverConditions {
    min_age?: Duration;
    max_age?: Duration;
    max_age_millis?: DurationValue<UnitMillis>;
    min_docs?: long;
    max_docs?: long;
    max_size?: ByteSize;
    max_size_bytes?: long;
    min_size?: ByteSize;
    min_size_bytes?: long;
    max_primary_shard_size?: ByteSize;
    max_primary_shard_size_bytes?: long;
    min_primary_shard_size?: ByteSize;
    min_primary_shard_size_bytes?: long;
    max_primary_shard_docs?: long;
    min_primary_shard_docs?: long;
}
export interface IndicesSegmentsIndexSegment {
    shards: Record<string, IndicesSegmentsShardsSegment | IndicesSegmentsShardsSegment[]>;
}
export interface IndicesSegmentsRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    verbose?: boolean;
}
export interface IndicesSegmentsResponse {
    indices: Record<string, IndicesSegmentsIndexSegment>;
    _shards: ShardStatistics;
}
export interface IndicesSegmentsSegment {
    attributes: Record<string, string>;
    committed: boolean;
    compound: boolean;
    deleted_docs: long;
    generation: integer;
    search: boolean;
    size_in_bytes: double;
    num_docs: long;
    version: VersionString;
}
export interface IndicesSegmentsShardSegmentRouting {
    node: string;
    primary: boolean;
    state: string;
}
export interface IndicesSegmentsShardsSegment {
    num_committed_segments: integer;
    routing: IndicesSegmentsShardSegmentRouting;
    num_search_segments: integer;
    segments: Record<string, IndicesSegmentsSegment>;
}
export interface IndicesShardStoresIndicesShardStores {
    shards: Record<string, IndicesShardStoresShardStoreWrapper>;
}
export interface IndicesShardStoresRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;
    status?: IndicesShardStoresShardStoreStatus | IndicesShardStoresShardStoreStatus[];
}
export interface IndicesShardStoresResponse {
    indices: Record<IndexName, IndicesShardStoresIndicesShardStores>;
}
export interface IndicesShardStoresShardStoreKeys {
    allocation: IndicesShardStoresShardStoreAllocation;
    allocation_id?: Id;
    store_exception?: IndicesShardStoresShardStoreException;
}
export type IndicesShardStoresShardStore = IndicesShardStoresShardStoreKeys & {
    [property: string]: IndicesShardStoresShardStoreNode | IndicesShardStoresShardStoreAllocation | Id | IndicesShardStoresShardStoreException;
};
export type IndicesShardStoresShardStoreAllocation = 'primary' | 'replica' | 'unused';
export interface IndicesShardStoresShardStoreException {
    reason: string;
    type: string;
}
export interface IndicesShardStoresShardStoreNode {
    attributes: Record<string, string>;
    ephemeral_id?: string;
    external_id?: string;
    name: Name;
    roles: string[];
    transport_address: TransportAddress;
}
export type IndicesShardStoresShardStoreStatus = 'green' | 'yellow' | 'red' | 'all';
export interface IndicesShardStoresShardStoreWrapper {
    stores: IndicesShardStoresShardStore[];
}
export interface IndicesShrinkRequest extends RequestBase {
    index: IndexName;
    target: IndexName;


    wait_for_active_shards?: WaitForActiveShards;
    aliases?: Record<IndexName, IndicesAlias>;
    settings?: Record<string, any>;
}
export interface IndicesShrinkResponse {
    acknowledged: boolean;
    shards_acknowledged: boolean;
    index: IndexName;
}
export interface IndicesSimulateIndexTemplateRequest extends RequestBase {
    name: Name;

    include_defaults?: boolean;
}
export interface IndicesSimulateIndexTemplateResponse {
    overlapping?: IndicesSimulateTemplateOverlapping[];
    template: IndicesSimulateTemplateTemplate;
}
export interface IndicesSimulateTemplateOverlapping {
    name: Name;
    index_patterns: string[];
}
export interface IndicesSimulateTemplateRequest extends RequestBase {
    name?: Name;
    create?: boolean;

    include_defaults?: boolean;
    allow_auto_create?: boolean;
    index_patterns?: Indices;
    composed_of?: Name[];
    template?: IndicesPutIndexTemplateIndexTemplateMapping;
    data_stream?: IndicesDataStreamVisibility;
    priority?: long;
    version?: VersionNumber;
    _meta?: Metadata;
    ignore_missing_component_templates?: string[];
    deprecated?: boolean;
}
export interface IndicesSimulateTemplateResponse {
    overlapping?: IndicesSimulateTemplateOverlapping[];
    template: IndicesSimulateTemplateTemplate;
}
export interface IndicesSimulateTemplateTemplate {
    aliases: Record<IndexName, IndicesAlias>;
    mappings: MappingTypeMapping;
    settings: IndicesIndexSettings;
}
export interface IndicesSplitRequest extends RequestBase {
    index: IndexName;
    target: IndexName;


    wait_for_active_shards?: WaitForActiveShards;
    aliases?: Record<IndexName, IndicesAlias>;
    settings?: Record<string, any>;
}
export interface IndicesSplitResponse {
    acknowledged: boolean;
    shards_acknowledged: boolean;
    index: IndexName;
}
export type IndicesStatsIndexMetadataState = 'open' | 'close';
export interface IndicesStatsIndexStats {
    completion?: CompletionStats;
    docs?: DocStats;
    fielddata?: FielddataStats;
    flush?: FlushStats;
    get?: GetStats;
    indexing?: IndexingStats;
    indices?: IndicesStatsIndicesStats;
    merges?: MergesStats;
    query_cache?: QueryCacheStats;
    recovery?: RecoveryStats;
    refresh?: RefreshStats;
    request_cache?: RequestCacheStats;
    search?: SearchStats;
    segments?: SegmentsStats;
    store?: StoreStats;
    translog?: TranslogStats;
    warmer?: WarmerStats;
    bulk?: BulkStats;
    shard_stats?: IndicesStatsShardsTotalStats;
}
export interface IndicesStatsIndicesStats {
    primaries?: IndicesStatsIndexStats;
    shards?: Record<string, IndicesStatsShardStats[]>;
    total?: IndicesStatsIndexStats;
    uuid?: Uuid;
    health?: HealthStatus;
    status?: IndicesStatsIndexMetadataState;
}
export interface IndicesStatsMappingStats {
    total_count: long;
    total_estimated_overhead?: ByteSize;
    total_estimated_overhead_in_bytes: long;
}
export interface IndicesStatsRequest extends RequestBase {
    metric?: Metrics;
    index?: Indices;
    completion_fields?: Fields;
    expand_wildcards?: ExpandWildcards;
    fielddata_fields?: Fields;
    fields?: Fields;
    forbid_closed_indices?: boolean;
    groups?: string | string[];
    include_segment_file_sizes?: boolean;
    include_unloaded_segments?: boolean;
    level?: Level;
}
export interface IndicesStatsResponse {
    indices?: Record<string, IndicesStatsIndicesStats>;
    _shards: ShardStatistics;
    _all: IndicesStatsIndicesStats;
}
export interface IndicesStatsShardCommit {
    generation: integer;
    id: Id;
    num_docs: long;
    user_data: Record<string, string>;
}
export interface IndicesStatsShardFileSizeInfo {
    description: string;
    size_in_bytes: long;
    min_size_in_bytes?: long;
    max_size_in_bytes?: long;
    average_size_in_bytes?: long;
    count?: long;
}
export interface IndicesStatsShardLease {
    id: Id;
    retaining_seq_no: SequenceNumber;
    timestamp: long;
    source: string;
}
export interface IndicesStatsShardPath {
    data_path: string;
    is_custom_data_path: boolean;
    state_path: string;
}
export interface IndicesStatsShardQueryCache {
    cache_count: long;
    cache_size: long;
    evictions: long;
    hit_count: long;
    memory_size_in_bytes: long;
    miss_count: long;
    total_count: long;
}
export interface IndicesStatsShardRetentionLeases {
    primary_term: long;
    version: VersionNumber;
    leases: IndicesStatsShardLease[];
}
export interface IndicesStatsShardRouting {
    node: string;
    primary: boolean;
    relocating_node?: string | null;
    state: IndicesStatsShardRoutingState;
}
export type IndicesStatsShardRoutingState = 'UNASSIGNED' | 'INITIALIZING' | 'STARTED' | 'RELOCATING';
export interface IndicesStatsShardSequenceNumber {
    global_checkpoint: long;
    local_checkpoint: long;
    max_seq_no: SequenceNumber;
}
export interface IndicesStatsShardStats {
    commit?: IndicesStatsShardCommit;
    completion?: CompletionStats;
    docs?: DocStats;
    fielddata?: FielddataStats;
    flush?: FlushStats;
    get?: GetStats;
    indexing?: IndexingStats;
    mappings?: IndicesStatsMappingStats;
    merges?: MergesStats;
    shard_path?: IndicesStatsShardPath;
    query_cache?: IndicesStatsShardQueryCache;
    recovery?: RecoveryStats;
    refresh?: RefreshStats;
    request_cache?: RequestCacheStats;
    retention_leases?: IndicesStatsShardRetentionLeases;
    routing?: IndicesStatsShardRouting;
    search?: SearchStats;
    segments?: SegmentsStats;
    seq_no?: IndicesStatsShardSequenceNumber;
    store?: StoreStats;
    translog?: TranslogStats;
    warmer?: WarmerStats;
    bulk?: BulkStats;
    shards?: Record<IndexName, any>;
    shard_stats?: IndicesStatsShardsTotalStats;
    indices?: IndicesStatsIndicesStats;
}
export interface IndicesStatsShardsTotalStats {
    total_count: long;
}
export interface IndicesUnfreezeRequest extends RequestBase {
    index: IndexName;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_unavailable?: boolean;


    wait_for_active_shards?: string;
}
export interface IndicesUnfreezeResponse {
    acknowledged: boolean;
    shards_acknowledged: boolean;
}
export interface IndicesUpdateAliasesAction {
    add?: IndicesUpdateAliasesAddAction;
    remove?: IndicesUpdateAliasesRemoveAction;
    remove_index?: IndicesUpdateAliasesRemoveIndexAction;
}
export interface IndicesUpdateAliasesAddAction {
    alias?: IndexAlias;
    aliases?: IndexAlias | IndexAlias[];
    filter?: QueryDslQueryContainer;
    index?: IndexName;
    indices?: Indices;
    index_routing?: Routing;
    is_hidden?: boolean;
    is_write_index?: boolean;
    routing?: Routing;
    search_routing?: Routing;
    must_exist?: boolean;
}
export interface IndicesUpdateAliasesRemoveAction {
    alias?: IndexAlias;
    aliases?: IndexAlias | IndexAlias[];
    index?: IndexName;
    indices?: Indices;
    must_exist?: boolean;
}
export interface IndicesUpdateAliasesRemoveIndexAction {
    index?: IndexName;
    indices?: Indices;
    must_exist?: boolean;
}
export interface IndicesUpdateAliasesRequest extends RequestBase {


    actions?: IndicesUpdateAliasesAction[];
}
export type IndicesUpdateAliasesResponse = AcknowledgedResponseBase;
export interface IndicesValidateQueryIndicesValidationExplanation {
    error?: string;
    explanation?: string;
    index: IndexName;
    valid: boolean;
}
export interface IndicesValidateQueryRequest extends RequestBase {
    index?: Indices;
    allow_no_indices?: boolean;
    all_shards?: boolean;
    analyzer?: string;
    analyze_wildcard?: boolean;
    default_operator?: QueryDslOperator;
    df?: string;
    expand_wildcards?: ExpandWildcards;
    explain?: boolean;
    ignore_unavailable?: boolean;
    lenient?: boolean;
    rewrite?: boolean;
    q?: string;
    query?: QueryDslQueryContainer;
}
export interface IndicesValidateQueryResponse {
    explanations?: IndicesValidateQueryIndicesValidationExplanation[];
    _shards?: ShardStatistics;
    valid: boolean;
    error?: string;
}
export interface InferenceCompletionResult {
    result: string;
}
export interface InferenceDeleteInferenceEndpointResult extends AcknowledgedResponseBase {
    pipelines: string[];
}
export type InferenceDenseByteVector = byte[];
export type InferenceDenseVector = float[];
export interface InferenceInferenceEndpoint {
    service: string;
    service_settings: InferenceServiceSettings;
    task_settings: InferenceTaskSettings;
}
export interface InferenceInferenceEndpointInfo extends InferenceInferenceEndpoint {
    inference_id: string;
    task_type: InferenceTaskType;
}
export interface InferenceInferenceResult {
    text_embedding_bytes?: InferenceTextEmbeddingByteResult[];
    text_embedding?: InferenceTextEmbeddingResult[];
    sparse_embedding?: InferenceSparseEmbeddingResult[];
    completion?: InferenceCompletionResult[];
    rerank?: InferenceRankedDocument[];
}
export interface InferenceRankedDocument {
    index: integer;
    score: float;
    text?: string;
}
export type InferenceServiceSettings = any;
export interface InferenceSparseEmbeddingResult {
    embedding: InferenceSparseVector;
}
export type InferenceSparseVector = Record<string, float>;
export type InferenceTaskSettings = any;
export type InferenceTaskType = 'sparse_embedding' | 'text_embedding' | 'rerank' | 'completion';
export interface InferenceTextEmbeddingByteResult {
    embedding: InferenceDenseByteVector;
}
export interface InferenceTextEmbeddingResult {
    embedding: InferenceDenseVector;
}
export interface InferenceDeleteRequest extends RequestBase {
    task_type?: InferenceTaskType;
    inference_id: Id;
    dry_run?: boolean;
    force?: boolean;
}
export type InferenceDeleteResponse = InferenceDeleteInferenceEndpointResult;
export interface InferenceGetRequest extends RequestBase {
    task_type?: InferenceTaskType;
    inference_id?: Id;
}
export interface InferenceGetResponse {
    endpoints: InferenceInferenceEndpointInfo[];
}
export interface InferenceInferenceRequest extends RequestBase {
    task_type?: InferenceTaskType;
    inference_id: Id;

    query?: string;
    input: string | string[];
    task_settings?: InferenceTaskSettings;
}
export type InferenceInferenceResponse = InferenceInferenceResult;
export interface InferencePutRequest extends RequestBase {
    task_type?: InferenceTaskType;
    inference_id: Id;
    inference_config?: InferenceInferenceEndpoint;
}
export type InferencePutResponse = InferenceInferenceEndpointInfo;
export interface IngestAppendProcessor extends IngestProcessorBase {
    field: Field;
    value: any[];
    allow_duplicates?: boolean;
}
export interface IngestAttachmentProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    indexed_chars?: long;
    indexed_chars_field?: Field;
    properties?: string[];
    target_field?: Field;
    remove_binary?: boolean;
    resource_name?: string;
}
export interface IngestBytesProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
}
export interface IngestCircleProcessor extends IngestProcessorBase {
    error_distance: double;
    field: Field;
    ignore_missing?: boolean;
    shape_type: IngestShapeType;
    target_field?: Field;
}
export interface IngestConvertProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
    type: IngestConvertType;
}
export type IngestConvertType = 'integer' | 'long' | 'float' | 'double' | 'string' | 'boolean' | 'auto';
export interface IngestCsvProcessor extends IngestProcessorBase {
    empty_value?: any;
    field: Field;
    ignore_missing?: boolean;
    quote?: string;
    separator?: string;
    target_fields: Fields;
    trim?: boolean;
}
export interface IngestDateIndexNameProcessor extends IngestProcessorBase {
    date_formats: string[];
    date_rounding: string;
    field: Field;
    index_name_format?: string;
    index_name_prefix?: string;
    locale?: string;
    timezone?: string;
}
export interface IngestDateProcessor extends IngestProcessorBase {
    field: Field;
    formats: string[];
    locale?: string;
    target_field?: Field;
    timezone?: string;
}
export interface IngestDissectProcessor extends IngestProcessorBase {
    append_separator?: string;
    field: Field;
    ignore_missing?: boolean;
    pattern: string;
}
export interface IngestDotExpanderProcessor extends IngestProcessorBase {
    field: Field;
    path?: string;
}
export interface IngestDropProcessor extends IngestProcessorBase {
}
export interface IngestEnrichProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    max_matches?: integer;
    override?: boolean;
    policy_name: string;
    shape_relation?: GeoShapeRelation;
    target_field: Field;
}
export interface IngestFailProcessor extends IngestProcessorBase {
    message: string;
}
export interface IngestForeachProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    processor: IngestProcessorContainer;
}
export interface IngestGeoIpProcessor extends IngestProcessorBase {
    database_file?: string;
    field: Field;
    first_only?: boolean;
    ignore_missing?: boolean;
    properties?: string[];
    target_field?: Field;
}
export interface IngestGrokProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    pattern_definitions?: Record<string, string>;
    patterns: string[];
    trace_match?: boolean;
}
export interface IngestGsubProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    pattern: string;
    replacement: string;
    target_field?: Field;
}
export interface IngestInferenceConfig {
    regression?: IngestInferenceConfigRegression;
    classification?: IngestInferenceConfigClassification;
}
export interface IngestInferenceConfigClassification {
    num_top_classes?: integer;
    num_top_feature_importance_values?: integer;
    results_field?: Field;
    top_classes_results_field?: Field;
    prediction_field_type?: string;
}
export interface IngestInferenceConfigRegression {
    results_field?: Field;
    num_top_feature_importance_values?: integer;
}
export interface IngestInferenceProcessor extends IngestProcessorBase {
    model_id: Id;
    target_field?: Field;
    field_map?: Record<Field, any>;
    inference_config?: IngestInferenceConfig;
}
export interface IngestJoinProcessor extends IngestProcessorBase {
    field: Field;
    separator: string;
    target_field?: Field;
}
export interface IngestJsonProcessor extends IngestProcessorBase {
    add_to_root?: boolean;
    add_to_root_conflict_strategy?: IngestJsonProcessorConflictStrategy;
    allow_duplicate_keys?: boolean;
    field: Field;
    target_field?: Field;
}
export type IngestJsonProcessorConflictStrategy = 'replace' | 'merge';
export interface IngestKeyValueProcessor extends IngestProcessorBase {
    exclude_keys?: string[];
    field: Field;
    field_split: string;
    ignore_missing?: boolean;
    include_keys?: string[];
    prefix?: string;
    strip_brackets?: boolean;
    target_field?: Field;
    trim_key?: string;
    trim_value?: string;
    value_split: string;
}
export interface IngestLowercaseProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
}
export interface IngestPipeline {
    description?: string;
    on_failure?: IngestProcessorContainer[];
    processors?: IngestProcessorContainer[];
    version?: VersionNumber;
    _meta?: Metadata;
}
export interface IngestPipelineConfig {
    description?: string;
    version?: VersionNumber;
    processors: IngestProcessorContainer[];
}
export interface IngestPipelineProcessor extends IngestProcessorBase {
    name: Name;
    ignore_missing_pipeline?: boolean;
}
export interface IngestProcessorBase {
    description?: string;
    if?: string;
    ignore_failure?: boolean;
    on_failure?: IngestProcessorContainer[];
    tag?: string;
}
export interface IngestProcessorContainer {
    append?: IngestAppendProcessor;
    attachment?: IngestAttachmentProcessor;
    bytes?: IngestBytesProcessor;
    circle?: IngestCircleProcessor;
    convert?: IngestConvertProcessor;
    csv?: IngestCsvProcessor;
    date?: IngestDateProcessor;
    date_index_name?: IngestDateIndexNameProcessor;
    dissect?: IngestDissectProcessor;
    dot_expander?: IngestDotExpanderProcessor;
    drop?: IngestDropProcessor;
    enrich?: IngestEnrichProcessor;
    fail?: IngestFailProcessor;
    foreach?: IngestForeachProcessor;
    geoip?: IngestGeoIpProcessor;
    grok?: IngestGrokProcessor;
    gsub?: IngestGsubProcessor;
    inference?: IngestInferenceProcessor;
    join?: IngestJoinProcessor;
    json?: IngestJsonProcessor;
    kv?: IngestKeyValueProcessor;
    lowercase?: IngestLowercaseProcessor;
    pipeline?: IngestPipelineProcessor;
    remove?: IngestRemoveProcessor;
    rename?: IngestRenameProcessor;
    reroute?: IngestRerouteProcessor;
    script?: IngestScriptProcessor;
    set?: IngestSetProcessor;
    set_security_user?: IngestSetSecurityUserProcessor;
    sort?: IngestSortProcessor;
    split?: IngestSplitProcessor;
    trim?: IngestTrimProcessor;
    uppercase?: IngestUppercaseProcessor;
    urldecode?: IngestUrlDecodeProcessor;
    user_agent?: IngestUserAgentProcessor;
}
export interface IngestRemoveProcessor extends IngestProcessorBase {
    field: Fields;
    keep?: Fields;
    ignore_missing?: boolean;
}
export interface IngestRenameProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field: Field;
}
export interface IngestRerouteProcessor extends IngestProcessorBase {
    destination?: string;
    dataset?: string | string[];
    namespace?: string | string[];
}
export interface IngestScriptProcessor extends IngestProcessorBase {
    id?: Id;
    lang?: string;
    params?: Record<string, any>;
    source?: string;
}
export interface IngestSetProcessor extends IngestProcessorBase {
    copy_from?: Field;
    field: Field;
    ignore_empty_value?: boolean;
    media_type?: string;
    override?: boolean;
    value?: any;
}
export interface IngestSetSecurityUserProcessor extends IngestProcessorBase {
    field: Field;
    properties?: string[];
}
export type IngestShapeType = 'geo_shape' | 'shape';
export interface IngestSortProcessor extends IngestProcessorBase {
    field: Field;
    order?: SortOrder;
    target_field?: Field;
}
export interface IngestSplitProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    preserve_trailing?: boolean;
    separator: string;
    target_field?: Field;
}
export interface IngestTrimProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
}
export interface IngestUppercaseProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
}
export interface IngestUrlDecodeProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    target_field?: Field;
}
export interface IngestUserAgentProcessor extends IngestProcessorBase {
    field: Field;
    ignore_missing?: boolean;
    options?: IngestUserAgentProperty[];
    regex_file?: string;
    target_field?: Field;
}
export type IngestUserAgentProperty = 'NAME' | 'MAJOR' | 'MINOR' | 'PATCH' | 'OS' | 'OS_NAME' | 'OS_MAJOR' | 'OS_MINOR' | 'DEVICE' | 'BUILD';
export interface IngestDeletePipelineRequest extends RequestBase {
    id: Id;


}
export type IngestDeletePipelineResponse = AcknowledgedResponseBase;
export interface IngestGeoIpStatsGeoIpDownloadStatistics {
    successful_downloads: integer;
    failed_downloads: integer;
    total_download_time: DurationValue<UnitMillis>;
    database_count: integer;
    skipped_updates: integer;
}
export interface IngestGeoIpStatsGeoIpNodeDatabaseName {
    name: Name;
}
export interface IngestGeoIpStatsGeoIpNodeDatabases {
    databases: IngestGeoIpStatsGeoIpNodeDatabaseName[];
    files_in_temp: string[];
}
export interface IngestGeoIpStatsRequest extends RequestBase {
}
export interface IngestGeoIpStatsResponse {
    stats: IngestGeoIpStatsGeoIpDownloadStatistics;
    nodes: Record<Id, IngestGeoIpStatsGeoIpNodeDatabases>;
}
export interface IngestGetPipelineRequest extends RequestBase {
    id?: Id;

    summary?: boolean;
}
export type IngestGetPipelineResponse = Record<string, IngestPipeline>;
export interface IngestProcessorGrokRequest extends RequestBase {
}
export interface IngestProcessorGrokResponse {
    patterns: Record<string, string>;
}
export interface IngestPutPipelineRequest extends RequestBase {
    id: Id;


    if_version?: VersionNumber;
    _meta?: Metadata;
    description?: string;
    on_failure?: IngestProcessorContainer[];
    processors?: IngestProcessorContainer[];
    version?: VersionNumber;
}
export type IngestPutPipelineResponse = AcknowledgedResponseBase;
export interface IngestSimulateDocument {
    _id?: Id;
    _index?: IndexName;
    _source: any;
}
export interface IngestSimulateDocumentSimulationKeys {
    _id: Id;
    _index: IndexName;
    _ingest: IngestSimulateIngest;
    _routing?: string;
    _source: Record<string, any>;
    _version?: SpecUtilsStringified<VersionNumber>;
    _version_type?: VersionType;
}
export type IngestSimulateDocumentSimulation = IngestSimulateDocumentSimulationKeys & {
    [property: string]: string | Id | IndexName | IngestSimulateIngest | Record<string, any> | SpecUtilsStringified<VersionNumber> | VersionType;
};
export interface IngestSimulateIngest {
    timestamp: DateTime;
    pipeline?: Name;
}
export interface IngestSimulatePipelineSimulation {
    doc?: IngestSimulateDocumentSimulation;
    processor_results?: IngestSimulatePipelineSimulation[];
    tag?: string;
    processor_type?: string;
    status?: WatcherActionStatusOptions;
}
export interface IngestSimulateRequest extends RequestBase {
    id?: Id;
    verbose?: boolean;
    docs?: IngestSimulateDocument[];
    pipeline?: IngestPipeline;
}
export interface IngestSimulateResponse {
    docs: IngestSimulatePipelineSimulation[];
}
export interface LicenseLicense {
    expiry_date_in_millis: EpochTime<UnitMillis>;
    issue_date_in_millis: EpochTime<UnitMillis>;
    start_date_in_millis?: EpochTime<UnitMillis>;
    issued_to: string;
    issuer: string;
    max_nodes?: long | null;
    max_resource_units?: long;
    signature: string;
    type: LicenseLicenseType;
    uid: string;
}
export type LicenseLicenseStatus = 'active' | 'valid' | 'invalid' | 'expired';
export type LicenseLicenseType = 'missing' | 'trial' | 'basic' | 'standard' | 'dev' | 'silver' | 'gold' | 'platinum' | 'enterprise';
export interface LicenseDeleteRequest extends RequestBase {
}
export type LicenseDeleteResponse = AcknowledgedResponseBase;
export interface LicenseGetLicenseInformation {
    expiry_date?: DateTime;
    expiry_date_in_millis?: EpochTime<UnitMillis>;
    issue_date: DateTime;
    issue_date_in_millis: EpochTime<UnitMillis>;
    issued_to: string;
    issuer: string;
    max_nodes: long | null;
    max_resource_units?: integer | null;
    status: LicenseLicenseStatus;
    type: LicenseLicenseType;
    uid: Uuid;
    start_date_in_millis: EpochTime<UnitMillis>;
}
export interface LicenseGetRequest extends RequestBase {
    accept_enterprise?: boolean;
    local?: boolean;
}
export interface LicenseGetResponse {
    license: LicenseGetLicenseInformation;
}
export interface LicenseGetBasicStatusRequest extends RequestBase {
}
export interface LicenseGetBasicStatusResponse {
    eligible_to_start_basic: boolean;
}
export interface LicenseGetTrialStatusRequest extends RequestBase {
}
export interface LicenseGetTrialStatusResponse {
    eligible_to_start_trial: boolean;
}
export interface LicensePostAcknowledgement {
    license: string[];
    message: string;
}
export interface LicensePostRequest extends RequestBase {
    acknowledge?: boolean;
    license?: LicenseLicense;
    licenses?: LicenseLicense[];
}
export interface LicensePostResponse {
    acknowledge?: LicensePostAcknowledgement;
    acknowledged: boolean;
    license_status: LicenseLicenseStatus;
}
export interface LicensePostStartBasicRequest extends RequestBase {
    acknowledge?: boolean;
}
export interface LicensePostStartBasicResponse {
    acknowledged: boolean;
    basic_was_started: boolean;
    error_message?: string;
    type?: LicenseLicenseType;
    acknowledge?: Record<string, string | string[]>;
}
export interface LicensePostStartTrialRequest extends RequestBase {
    acknowledge?: boolean;
    type_query_string?: string;
}
export interface LicensePostStartTrialResponse {
    acknowledged: boolean;
    error_message?: string;
    trial_was_started: boolean;
    type?: LicenseLicenseType;
}
export interface LogstashPipeline {
    description: string;
    last_modified: DateTime;
    pipeline_metadata: LogstashPipelineMetadata;
    username: string;
    pipeline: string;
    pipeline_settings: LogstashPipelineSettings;
}
export interface LogstashPipelineMetadata {
    type: string;
    version: string;
}
export interface LogstashPipelineSettings {
    'pipeline.workers': integer;
    'pipeline.batch.size': integer;
    'pipeline.batch.delay': integer;
    'queue.type': string;
    'queue.max_bytes.number': integer;
    'queue.max_bytes.units': string;
    'queue.checkpoint.writes': integer;
}
export interface LogstashDeletePipelineRequest extends RequestBase {
    id: Id;
}
export type LogstashDeletePipelineResponse = boolean;
export interface LogstashGetPipelineRequest extends RequestBase {
    id?: Ids;
}
export type LogstashGetPipelineResponse = Record<Id, LogstashPipeline>;
export interface LogstashPutPipelineRequest extends RequestBase {
    id: Id;
    pipeline?: LogstashPipeline;
}
export type LogstashPutPipelineResponse = boolean;
export interface MigrationDeprecationsDeprecation {
    details: string;
    level: MigrationDeprecationsDeprecationLevel;
    message: string;
    url: string;
}
export type MigrationDeprecationsDeprecationLevel = 'none' | 'info' | 'warning' | 'critical';
export interface MigrationDeprecationsRequest extends RequestBase {
    index?: IndexName;
}
export interface MigrationDeprecationsResponse {
    cluster_settings: MigrationDeprecationsDeprecation[];
    index_settings: Record<string, MigrationDeprecationsDeprecation[]>;
    node_settings: MigrationDeprecationsDeprecation[];
    ml_settings: MigrationDeprecationsDeprecation[];
}
export interface MigrationGetFeatureUpgradeStatusMigrationFeature {
    feature_name: string;
    minimum_index_version: VersionString;
    migration_status: MigrationGetFeatureUpgradeStatusMigrationStatus;
    indices: MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo[];
}
export interface MigrationGetFeatureUpgradeStatusMigrationFeatureIndexInfo {
    index: IndexName;
    version: VersionString;
    failure_cause?: ErrorCause;
}
export type MigrationGetFeatureUpgradeStatusMigrationStatus = 'NO_MIGRATION_NEEDED' | 'MIGRATION_NEEDED' | 'IN_PROGRESS' | 'ERROR';
export interface MigrationGetFeatureUpgradeStatusRequest extends RequestBase {
}
export interface MigrationGetFeatureUpgradeStatusResponse {
    features: MigrationGetFeatureUpgradeStatusMigrationFeature[];
    migration_status: MigrationGetFeatureUpgradeStatusMigrationStatus;
}
export interface MigrationPostFeatureUpgradeMigrationFeature {
    feature_name: string;
}
export interface MigrationPostFeatureUpgradeRequest extends RequestBase {
}
export interface MigrationPostFeatureUpgradeResponse {
    accepted: boolean;
    features: MigrationPostFeatureUpgradeMigrationFeature[];
}
export interface MlAnalysisConfig {
    bucket_span?: Duration;
    categorization_analyzer?: MlCategorizationAnalyzer;
    categorization_field_name?: Field;
    categorization_filters?: string[];
    detectors: MlDetector[];
    influencers?: Field[];
    latency?: Duration;
    model_prune_window?: Duration;
    multivariate_by_fields?: boolean;
    per_partition_categorization?: MlPerPartitionCategorization;
    summary_count_field_name?: Field;
}
export interface MlAnalysisConfigRead {
    bucket_span: Duration;
    categorization_analyzer?: MlCategorizationAnalyzer;
    categorization_field_name?: Field;
    categorization_filters?: string[];
    detectors: MlDetectorRead[];
    influencers: Field[];
    model_prune_window?: Duration;
    latency?: Duration;
    multivariate_by_fields?: boolean;
    per_partition_categorization?: MlPerPartitionCategorization;
    summary_count_field_name?: Field;
}
export interface MlAnalysisLimits {
    categorization_examples_limit?: long;
    model_memory_limit?: string;
}
export interface MlAnalysisMemoryLimit {
    model_memory_limit: string;
}
export interface MlAnomaly {
    actual?: double[];
    anomaly_score_explanation?: MlAnomalyExplanation;
    bucket_span: DurationValue<UnitSeconds>;
    by_field_name?: string;
    by_field_value?: string;
    causes?: MlAnomalyCause[];
    detector_index: integer;
    field_name?: string;
    function?: string;
    function_description?: string;
    geo_results?: MlGeoResults;
    influencers?: MlInfluence[];
    initial_record_score: double;
    is_interim: boolean;
    job_id: string;
    over_field_name?: string;
    over_field_value?: string;
    partition_field_name?: string;
    partition_field_value?: string;
    probability: double;
    record_score: double;
    result_type: string;
    timestamp: EpochTime<UnitMillis>;
    typical?: double[];
}
export interface MlAnomalyCause {
    actual: double[];
    by_field_name: Name;
    by_field_value: string;
    correlated_by_field_value: string;
    field_name: Field;
    function: string;
    function_description: string;
    influencers: MlInfluence[];
    over_field_name: Name;
    over_field_value: string;
    partition_field_name: string;
    partition_field_value: string;
    probability: double;
    typical: double[];
}
export interface MlAnomalyExplanation {
    anomaly_characteristics_impact?: integer;
    anomaly_length?: integer;
    anomaly_type?: string;
    high_variance_penalty?: boolean;
    incomplete_bucket_penalty?: boolean;
    lower_confidence_bound?: double;
    multi_bucket_impact?: integer;
    single_bucket_impact?: integer;
    typical_value?: double;
    upper_confidence_bound?: double;
}
export interface MlApiKeyAuthorization {
    id: string;
    name: string;
}
export type MlAppliesTo = 'actual' | 'typical' | 'diff_from_typical' | 'time';
export interface MlBucketInfluencer {
    anomaly_score: double;
    bucket_span: DurationValue<UnitSeconds>;
    influencer_field_name: Field;
    initial_anomaly_score: double;
    is_interim: boolean;
    job_id: Id;
    probability: double;
    raw_anomaly_score: double;
    result_type: string;
    timestamp: EpochTime<UnitMillis>;
    timestamp_string?: DateTime;
}
export interface MlBucketSummary {
    anomaly_score: double;
    bucket_influencers: MlBucketInfluencer[];
    bucket_span: DurationValue<UnitSeconds>;
    event_count: long;
    initial_anomaly_score: double;
    is_interim: boolean;
    job_id: Id;
    processing_time_ms: DurationValue<UnitMillis>;
    result_type: string;
    timestamp: EpochTime<UnitMillis>;
    timestamp_string?: DateTime;
}
export interface MlCalendarEvent {
    calendar_id?: Id;
    event_id?: Id;
    description: string;
    end_time: DateTime;
    start_time: DateTime;
}
export type MlCategorizationAnalyzer = string | MlCategorizationAnalyzerDefinition;
export interface MlCategorizationAnalyzerDefinition {
    char_filter?: AnalysisCharFilter[];
    filter?: AnalysisTokenFilter[];
    tokenizer?: AnalysisTokenizer;
}
export type MlCategorizationStatus = 'ok' | 'warn';
export interface MlCategory {
    category_id: ulong;
    examples: string[];
    grok_pattern?: string;
    job_id: Id;
    max_matching_length: ulong;
    partition_field_name?: string;
    partition_field_value?: string;
    regex: string;
    terms: string;
    num_matches?: long;
    preferred_to_categories?: Id[];
    p?: string;
    result_type: string;
    mlcategory: string;
}
export interface MlChunkingConfig {
    mode: MlChunkingMode;
    time_span?: Duration;
}
export type MlChunkingMode = 'auto' | 'manual' | 'off';
export interface MlClassificationInferenceOptions {
    num_top_classes?: integer;
    num_top_feature_importance_values?: integer;
    prediction_field_type?: string;
    results_field?: string;
    top_classes_results_field?: string;
}
export type MlConditionOperator = 'gt' | 'gte' | 'lt' | 'lte';
export type MlCustomSettings = any;
export interface MlDataCounts {
    bucket_count: long;
    earliest_record_timestamp?: long;
    empty_bucket_count: long;
    input_bytes: long;
    input_field_count: long;
    input_record_count: long;
    invalid_date_count: long;
    job_id: Id;
    last_data_time?: long;
    latest_empty_bucket_timestamp?: long;
    latest_record_timestamp?: long;
    latest_sparse_bucket_timestamp?: long;
    latest_bucket_timestamp?: long;
    log_time?: long;
    missing_field_count: long;
    out_of_order_timestamp_count: long;
    processed_field_count: long;
    processed_record_count: long;
    sparse_bucket_count: long;
}
export interface MlDataDescription {
    format?: string;
    time_field?: Field;
    time_format?: string;
    field_delimiter?: string;
}
export interface MlDatafeed {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    aggs?: Record<string, AggregationsAggregationContainer>;
    authorization?: MlDatafeedAuthorization;
    chunking_config?: MlChunkingConfig;
    datafeed_id: Id;
    frequency?: Duration;
    indices: string[];
    indexes?: string[];
    job_id: Id;
    max_empty_searches?: integer;
    query: QueryDslQueryContainer;
    query_delay?: Duration;
    script_fields?: Record<string, ScriptField>;
    scroll_size?: integer;
    delayed_data_check_config: MlDelayedDataCheckConfig;
    runtime_mappings?: MappingRuntimeFields;
    indices_options?: IndicesOptions;
}
export interface MlDatafeedAuthorization {
    api_key?: MlApiKeyAuthorization;
    roles?: string[];
    service_account?: string;
}
export interface MlDatafeedConfig {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    aggs?: Record<string, AggregationsAggregationContainer>;
    chunking_config?: MlChunkingConfig;
    datafeed_id?: Id;
    delayed_data_check_config?: MlDelayedDataCheckConfig;
    frequency?: Duration;
    indices?: Indices;
    indexes?: Indices;
    indices_options?: IndicesOptions;
    job_id?: Id;
    max_empty_searches?: integer;
    query?: QueryDslQueryContainer;
    query_delay?: Duration;
    runtime_mappings?: MappingRuntimeFields;
    script_fields?: Record<string, ScriptField>;
    scroll_size?: integer;
}
export interface MlDatafeedRunningState {
    real_time_configured: boolean;
    real_time_running: boolean;
    search_interval?: MlRunningStateSearchInterval;
}
export type MlDatafeedState = 'started' | 'stopped' | 'starting' | 'stopping';
export interface MlDatafeedStats {
    assignment_explanation?: string;
    datafeed_id: Id;
    node?: MlDiscoveryNode;
    state: MlDatafeedState;
    timing_stats: MlDatafeedTimingStats;
    running_state?: MlDatafeedRunningState;
}
export interface MlDatafeedTimingStats {
    bucket_count: long;
    exponential_average_search_time_per_hour_ms: DurationValue<UnitFloatMillis>;
    job_id: Id;
    search_count: long;
    total_search_time_ms: DurationValue<UnitFloatMillis>;
    average_search_time_per_bucket_ms?: DurationValue<UnitFloatMillis>;
}
export interface MlDataframeAnalysis {
    alpha?: double;
    dependent_variable: string;
    downsample_factor?: double;
    early_stopping_enabled?: boolean;
    eta?: double;
    eta_growth_rate_per_tree?: double;
    feature_bag_fraction?: double;
    feature_processors?: MlDataframeAnalysisFeatureProcessor[];
    gamma?: double;
    lambda?: double;
    max_optimization_rounds_per_hyperparameter?: integer;
    max_trees?: integer;
    maximum_number_trees?: integer;
    num_top_feature_importance_values?: integer;
    prediction_field_name?: Field;
    randomize_seed?: double;
    soft_tree_depth_limit?: integer;
    soft_tree_depth_tolerance?: double;
    training_percent?: Percentage;
}
export interface MlDataframeAnalysisAnalyzedFields {
    includes: string[];
    excludes: string[];
}
export interface MlDataframeAnalysisClassification extends MlDataframeAnalysis {
    class_assignment_objective?: string;
    num_top_classes?: integer;
}
export interface MlDataframeAnalysisContainer {
    classification?: MlDataframeAnalysisClassification;
    outlier_detection?: MlDataframeAnalysisOutlierDetection;
    regression?: MlDataframeAnalysisRegression;
}
export interface MlDataframeAnalysisFeatureProcessor {
    frequency_encoding?: MlDataframeAnalysisFeatureProcessorFrequencyEncoding;
    multi_encoding?: MlDataframeAnalysisFeatureProcessorMultiEncoding;
    n_gram_encoding?: MlDataframeAnalysisFeatureProcessorNGramEncoding;
    one_hot_encoding?: MlDataframeAnalysisFeatureProcessorOneHotEncoding;
    target_mean_encoding?: MlDataframeAnalysisFeatureProcessorTargetMeanEncoding;
}
export interface MlDataframeAnalysisFeatureProcessorFrequencyEncoding {
    feature_name: Name;
    field: Field;
    frequency_map: Record<string, double>;
}
export interface MlDataframeAnalysisFeatureProcessorMultiEncoding {
    processors: integer[];
}
export interface MlDataframeAnalysisFeatureProcessorNGramEncoding {
    feature_prefix?: string;
    field: Field;
    length?: integer;
    n_grams: integer[];
    start?: integer;
    custom?: boolean;
}
export interface MlDataframeAnalysisFeatureProcessorOneHotEncoding {
    field: Field;
    hot_map: string;
}
export interface MlDataframeAnalysisFeatureProcessorTargetMeanEncoding {
    default_value: integer;
    feature_name: Name;
    field: Field;
    target_map: Record<string, any>;
}
export interface MlDataframeAnalysisOutlierDetection {
    compute_feature_influence?: boolean;
    feature_influence_threshold?: double;
    method?: string;
    n_neighbors?: integer;
    outlier_fraction?: double;
    standardization_enabled?: boolean;
}
export interface MlDataframeAnalysisRegression extends MlDataframeAnalysis {
    loss_function?: string;
    loss_function_parameter?: double;
}
export interface MlDataframeAnalytics {
    analysis_stats?: MlDataframeAnalyticsStatsContainer;
    assignment_explanation?: string;
    data_counts: MlDataframeAnalyticsStatsDataCounts;
    id: Id;
    memory_usage: MlDataframeAnalyticsStatsMemoryUsage;
    node?: NodeAttributes;
    progress: MlDataframeAnalyticsStatsProgress[];
    state: MlDataframeState;
}
export interface MlDataframeAnalyticsAuthorization {
    api_key?: MlApiKeyAuthorization;
    roles?: string[];
    service_account?: string;
}
export interface MlDataframeAnalyticsDestination {
    index: IndexName;
    results_field?: Field;
}
export interface MlDataframeAnalyticsFieldSelection {
    is_included: boolean;
    is_required: boolean;
    feature_type?: string;
    mapping_types: string[];
    name: Field;
    reason?: string;
}
export interface MlDataframeAnalyticsMemoryEstimation {
    expected_memory_with_disk: string;
    expected_memory_without_disk: string;
}
export interface MlDataframeAnalyticsSource {
    index: Indices;
    query?: QueryDslQueryContainer;
    runtime_mappings?: MappingRuntimeFields;
    _source?: MlDataframeAnalysisAnalyzedFields | string[];
}
export interface MlDataframeAnalyticsStatsContainer {
    classification_stats?: MlDataframeAnalyticsStatsHyperparameters;
    outlier_detection_stats?: MlDataframeAnalyticsStatsOutlierDetection;
    regression_stats?: MlDataframeAnalyticsStatsHyperparameters;
}
export interface MlDataframeAnalyticsStatsDataCounts {
    skipped_docs_count: integer;
    test_docs_count: integer;
    training_docs_count: integer;
}
export interface MlDataframeAnalyticsStatsHyperparameters {
    hyperparameters: MlHyperparameters;
    iteration: integer;
    timestamp: EpochTime<UnitMillis>;
    timing_stats: MlTimingStats;
    validation_loss: MlValidationLoss;
}
export interface MlDataframeAnalyticsStatsMemoryUsage {
    memory_reestimate_bytes?: long;
    peak_usage_bytes: long;
    status: string;
    timestamp?: EpochTime<UnitMillis>;
}
export interface MlDataframeAnalyticsStatsOutlierDetection {
    parameters: MlOutlierDetectionParameters;
    timestamp: EpochTime<UnitMillis>;
    timing_stats: MlTimingStats;
}
export interface MlDataframeAnalyticsStatsProgress {
    phase: string;
    progress_percent: integer;
}
export interface MlDataframeAnalyticsSummary {
    allow_lazy_start?: boolean;
    analysis: MlDataframeAnalysisContainer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
    authorization?: MlDataframeAnalyticsAuthorization;
    create_time?: EpochTime<UnitMillis>;
    description?: string;
    dest: MlDataframeAnalyticsDestination;
    id: Id;
    max_num_threads?: integer;
    model_memory_limit?: string;
    source: MlDataframeAnalyticsSource;
    version?: VersionString;
}
export interface MlDataframeEvaluationClassification {
    actual_field: Field;
    predicted_field?: Field;
    top_classes_field?: Field;
    metrics?: MlDataframeEvaluationClassificationMetrics;
}
export interface MlDataframeEvaluationClassificationMetrics extends MlDataframeEvaluationMetrics {
    accuracy?: Record<string, any>;
    multiclass_confusion_matrix?: Record<string, any>;
}
export interface MlDataframeEvaluationClassificationMetricsAucRoc {
    class_name?: Name;
    include_curve?: boolean;
}
export interface MlDataframeEvaluationContainer {
    classification?: MlDataframeEvaluationClassification;
    outlier_detection?: MlDataframeEvaluationOutlierDetection;
    regression?: MlDataframeEvaluationRegression;
}
export interface MlDataframeEvaluationMetrics {
    auc_roc?: MlDataframeEvaluationClassificationMetricsAucRoc;
    precision?: Record<string, any>;
    recall?: Record<string, any>;
}
export interface MlDataframeEvaluationOutlierDetection {
    actual_field: Field;
    predicted_probability_field: Field;
    metrics?: MlDataframeEvaluationOutlierDetectionMetrics;
}
export interface MlDataframeEvaluationOutlierDetectionMetrics extends MlDataframeEvaluationMetrics {
    confusion_matrix?: Record<string, any>;
}
export interface MlDataframeEvaluationRegression {
    actual_field: Field;
    predicted_field: Field;
    metrics?: MlDataframeEvaluationRegressionMetrics;
}
export interface MlDataframeEvaluationRegressionMetrics {
    mse?: Record<string, any>;
    msle?: MlDataframeEvaluationRegressionMetricsMsle;
    huber?: MlDataframeEvaluationRegressionMetricsHuber;
    r_squared?: Record<string, any>;
}
export interface MlDataframeEvaluationRegressionMetricsHuber {
    delta?: double;
}
export interface MlDataframeEvaluationRegressionMetricsMsle {
    offset?: double;
}
export type MlDataframeState = 'started' | 'stopped' | 'starting' | 'stopping' | 'failed';
export interface MlDelayedDataCheckConfig {
    check_window?: Duration;
    enabled: boolean;
}
export type MlDeploymentAllocationState = 'started' | 'starting' | 'fully_allocated';
export type MlDeploymentAssignmentState = 'starting' | 'started' | 'stopping' | 'failed';
export type MlDeploymentState = 'started' | 'starting' | 'stopping';
export interface MlDetectionRule {
    actions?: MlRuleAction[];
    conditions?: MlRuleCondition[];
    scope?: Record<Field, MlFilterRef>;
}
export interface MlDetector {
    by_field_name?: Field;
    custom_rules?: MlDetectionRule[];
    detector_description?: string;
    detector_index?: integer;
    exclude_frequent?: MlExcludeFrequent;
    field_name?: Field;
    function?: string;
    over_field_name?: Field;
    partition_field_name?: Field;
    use_null?: boolean;
}
export interface MlDetectorRead {
    by_field_name?: Field;
    custom_rules?: MlDetectionRule[];
    detector_description?: string;
    detector_index?: integer;
    exclude_frequent?: MlExcludeFrequent;
    field_name?: Field;
    function: string;
    over_field_name?: Field;
    partition_field_name?: Field;
    use_null?: boolean;
}
export interface MlDiscoveryNode {
    attributes: Record<string, string>;
    ephemeral_id: Id;
    id: Id;
    name: Name;
    transport_address: TransportAddress;
}
export type MlExcludeFrequent = 'all' | 'none' | 'by' | 'over';
export interface MlFillMaskInferenceOptions {
    mask_token?: string;
    num_top_classes?: integer;
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
}
export interface MlFillMaskInferenceUpdateOptions {
    num_top_classes?: integer;
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
}
export interface MlFilter {
    description?: string;
    filter_id: Id;
    items: string[];
}
export interface MlFilterRef {
    filter_id: Id;
    filter_type?: MlFilterType;
}
export type MlFilterType = 'include' | 'exclude';
export interface MlGeoResults {
    actual_point: string;
    typical_point: string;
}
export interface MlHyperparameter {
    absolute_importance?: double;
    name: Name;
    relative_importance?: double;
    supplied: boolean;
    value: double;
}
export interface MlHyperparameters {
    alpha?: double;
    lambda?: double;
    gamma?: double;
    eta?: double;
    eta_growth_rate_per_tree?: double;
    feature_bag_fraction?: double;
    downsample_factor?: double;
    max_attempts_to_add_tree?: integer;
    max_optimization_rounds_per_hyperparameter?: integer;
    max_trees?: integer;
    num_folds?: integer;
    num_splits_per_feature?: integer;
    soft_tree_depth_limit?: integer;
    soft_tree_depth_tolerance?: double;
}
export type MlInclude = 'definition' | 'feature_importance_baseline' | 'hyperparameters' | 'total_feature_importance' | 'definition_status';
export interface MlInferenceConfigCreateContainer {
    regression?: MlRegressionInferenceOptions;
    classification?: MlClassificationInferenceOptions;
    text_classification?: MlTextClassificationInferenceOptions;
    zero_shot_classification?: MlZeroShotClassificationInferenceOptions;
    fill_mask?: MlFillMaskInferenceOptions;
    ner?: MlNerInferenceOptions;
    pass_through?: MlPassThroughInferenceOptions;
    text_embedding?: MlTextEmbeddingInferenceOptions;
    text_expansion?: MlTextExpansionInferenceOptions;
    question_answering?: MlQuestionAnsweringInferenceOptions;
}
export interface MlInferenceConfigUpdateContainer {
    regression?: MlRegressionInferenceOptions;
    classification?: MlClassificationInferenceOptions;
    text_classification?: MlTextClassificationInferenceUpdateOptions;
    zero_shot_classification?: MlZeroShotClassificationInferenceUpdateOptions;
    fill_mask?: MlFillMaskInferenceUpdateOptions;
    ner?: MlNerInferenceUpdateOptions;
    pass_through?: MlPassThroughInferenceUpdateOptions;
    text_embedding?: MlTextEmbeddingInferenceUpdateOptions;
    text_expansion?: MlTextExpansionInferenceUpdateOptions;
    question_answering?: MlQuestionAnsweringInferenceUpdateOptions;
}
export interface MlInferenceResponseResult {
    entities?: MlTrainedModelEntities[];
    is_truncated?: boolean;
    predicted_value?: MlPredictedValue | MlPredictedValue[];
    predicted_value_sequence?: string;
    prediction_probability?: double;
    prediction_score?: double;
    top_classes?: MlTopClassEntry[];
    warning?: string;
    feature_importance?: MlTrainedModelInferenceFeatureImportance[];
}
export interface MlInfluence {
    influencer_field_name: string;
    influencer_field_values: string[];
}
export interface MlInfluencer {
    bucket_span: DurationValue<UnitSeconds>;
    influencer_score: double;
    influencer_field_name: Field;
    influencer_field_value: string;
    initial_influencer_score: double;
    is_interim: boolean;
    job_id: Id;
    probability: double;
    result_type: string;
    timestamp: EpochTime<UnitMillis>;
    foo?: string;
}
export interface MlJob {
    allow_lazy_open: boolean;
    analysis_config: MlAnalysisConfig;
    analysis_limits?: MlAnalysisLimits;
    background_persist_interval?: Duration;
    blocked?: MlJobBlocked;
    create_time?: DateTime;
    custom_settings?: MlCustomSettings;
    daily_model_snapshot_retention_after_days?: long;
    data_description: MlDataDescription;
    datafeed_config?: MlDatafeed;
    deleting?: boolean;
    description?: string;
    finished_time?: DateTime;
    groups?: string[];
    job_id: Id;
    job_type?: string;
    job_version?: VersionString;
    model_plot_config?: MlModelPlotConfig;
    model_snapshot_id?: Id;
    model_snapshot_retention_days: long;
    renormalization_window_days?: long;
    results_index_name: IndexName;
    results_retention_days?: long;
}
export interface MlJobBlocked {
    reason: MlJobBlockedReason;
    task_id?: TaskId;
}
export type MlJobBlockedReason = 'delete' | 'reset' | 'revert';
export interface MlJobConfig {
    allow_lazy_open?: boolean;
    analysis_config: MlAnalysisConfig;
    analysis_limits?: MlAnalysisLimits;
    background_persist_interval?: Duration;
    custom_settings?: MlCustomSettings;
    daily_model_snapshot_retention_after_days?: long;
    data_description: MlDataDescription;
    datafeed_config?: MlDatafeedConfig;
    description?: string;
    groups?: string[];
    job_id?: Id;
    job_type?: string;
    model_plot_config?: MlModelPlotConfig;
    model_snapshot_retention_days?: long;
    renormalization_window_days?: long;
    results_index_name?: IndexName;
    results_retention_days?: long;
}
export interface MlJobForecastStatistics {
    memory_bytes?: MlJobStatistics;
    processing_time_ms?: MlJobStatistics;
    records?: MlJobStatistics;
    status?: Record<string, long>;
    total: long;
    forecasted_jobs: integer;
}
export type MlJobState = 'closing' | 'closed' | 'opened' | 'failed' | 'opening';
export interface MlJobStatistics {
    avg: double;
    max: double;
    min: double;
    total: double;
}
export interface MlJobStats {
    assignment_explanation?: string;
    data_counts: MlDataCounts;
    forecasts_stats: MlJobForecastStatistics;
    job_id: string;
    model_size_stats: MlModelSizeStats;
    node?: MlDiscoveryNode;
    open_time?: DateTime;
    state: MlJobState;
    timing_stats: MlJobTimingStats;
    deleting?: boolean;
}
export interface MlJobTimingStats {
    average_bucket_processing_time_ms?: DurationValue<UnitFloatMillis>;
    bucket_count: long;
    exponential_average_bucket_processing_time_ms?: DurationValue<UnitFloatMillis>;
    exponential_average_bucket_processing_time_per_hour_ms: DurationValue<UnitFloatMillis>;
    job_id: Id;
    total_bucket_processing_time_ms: DurationValue<UnitFloatMillis>;
    maximum_bucket_processing_time_ms?: DurationValue<UnitFloatMillis>;
    minimum_bucket_processing_time_ms?: DurationValue<UnitFloatMillis>;
}
export type MlMemoryStatus = 'ok' | 'soft_limit' | 'hard_limit';
export interface MlModelPlotConfig {
    annotations_enabled?: boolean;
    enabled?: boolean;
    terms?: Field;
}
export interface MlModelSizeStats {
    bucket_allocation_failures_count: long;
    job_id: Id;
    log_time: DateTime;
    memory_status: MlMemoryStatus;
    model_bytes: ByteSize;
    model_bytes_exceeded?: ByteSize;
    model_bytes_memory_limit?: ByteSize;
    peak_model_bytes?: ByteSize;
    assignment_memory_basis?: string;
    result_type: string;
    total_by_field_count: long;
    total_over_field_count: long;
    total_partition_field_count: long;
    categorization_status: MlCategorizationStatus;
    categorized_doc_count: integer;
    dead_category_count: integer;
    failed_category_count: integer;
    frequent_category_count: integer;
    rare_category_count: integer;
    total_category_count: integer;
    timestamp?: long;
}
export interface MlModelSnapshot {
    description?: string;
    job_id: Id;
    latest_record_time_stamp?: integer;
    latest_result_time_stamp?: integer;
    min_version: VersionString;
    model_size_stats?: MlModelSizeStats;
    retain: boolean;
    snapshot_doc_count: long;
    snapshot_id: Id;
    timestamp: long;
}
export interface MlModelSnapshotUpgrade {
    job_id: Id;
    snapshot_id: Id;
    state: MlSnapshotUpgradeState;
    node: MlDiscoveryNode;
    assignment_explanation: string;
}
export interface MlNerInferenceOptions {
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
    classification_labels?: string[];
    vocabulary?: MlVocabulary;
}
export interface MlNerInferenceUpdateOptions {
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
}
export interface MlNlpBertTokenizationConfig {
    do_lower_case?: boolean;
    with_special_tokens?: boolean;
    max_sequence_length?: integer;
    truncate?: MlTokenizationTruncate;
    span?: integer;
}
export interface MlNlpRobertaTokenizationConfig {
    add_prefix_space?: boolean;
    with_special_tokens?: boolean;
    max_sequence_length?: integer;
    truncate?: MlTokenizationTruncate;
    span?: integer;
}
export interface MlNlpTokenizationUpdateOptions {
    truncate?: MlTokenizationTruncate;
    span?: integer;
}
export interface MlOutlierDetectionParameters {
    compute_feature_influence?: boolean;
    feature_influence_threshold?: double;
    method?: string;
    n_neighbors?: integer;
    outlier_fraction?: double;
    standardization_enabled?: boolean;
}
export interface MlOverallBucket {
    bucket_span: DurationValue<UnitSeconds>;
    is_interim: boolean;
    jobs: MlOverallBucketJob[];
    overall_score: double;
    result_type: string;
    timestamp: EpochTime<UnitMillis>;
    timestamp_string: DateTime;
}
export interface MlOverallBucketJob {
    job_id: Id;
    max_anomaly_score: double;
}
export interface MlPage {
    from?: integer;
    size?: integer;
}
export interface MlPassThroughInferenceOptions {
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
    vocabulary?: MlVocabulary;
}
export interface MlPassThroughInferenceUpdateOptions {
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
}
export interface MlPerPartitionCategorization {
    enabled?: boolean;
    stop_on_warn?: boolean;
}
export type MlPredictedValue = string | double | boolean | integer;
export interface MlQuestionAnsweringInferenceOptions {
    num_top_classes?: integer;
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
    max_answer_length?: integer;
}
export interface MlQuestionAnsweringInferenceUpdateOptions {
    question: string;
    num_top_classes?: integer;
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
    max_answer_length?: integer;
}
export interface MlRegressionInferenceOptions {
    results_field?: Field;
    num_top_feature_importance_values?: integer;
}
export type MlRoutingState = 'failed' | 'started' | 'starting' | 'stopped' | 'stopping';
export type MlRuleAction = 'skip_result' | 'skip_model_update';
export interface MlRuleCondition {
    applies_to: MlAppliesTo;
    operator: MlConditionOperator;
    value: double;
}
export interface MlRunningStateSearchInterval {
    end?: Duration;
    end_ms: DurationValue<UnitMillis>;
    start?: Duration;
    start_ms: DurationValue<UnitMillis>;
}
export type MlSnapshotUpgradeState = 'loading_old_state' | 'saving_new_state' | 'stopped' | 'failed';
export interface MlTextClassificationInferenceOptions {
    num_top_classes?: integer;
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
    classification_labels?: string[];
}
export interface MlTextClassificationInferenceUpdateOptions {
    num_top_classes?: integer;
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
    classification_labels?: string[];
}
export interface MlTextEmbeddingInferenceOptions {
    embedding_size?: integer;
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
}
export interface MlTextEmbeddingInferenceUpdateOptions {
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
}
export interface MlTextExpansionInferenceOptions {
    tokenization?: MlTokenizationConfigContainer;
    results_field?: string;
}
export interface MlTextExpansionInferenceUpdateOptions {
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
}
export interface MlTimingStats {
    elapsed_time: DurationValue<UnitMillis>;
    iteration_time?: DurationValue<UnitMillis>;
}
export interface MlTokenizationConfigContainer {
    bert?: MlNlpBertTokenizationConfig;
    mpnet?: MlNlpBertTokenizationConfig;
    roberta?: MlNlpRobertaTokenizationConfig;
}
export type MlTokenizationTruncate = 'first' | 'second' | 'none';
export interface MlTopClassEntry {
    class_name: string;
    class_probability: double;
    class_score: double;
}
export interface MlTotalFeatureImportance {
    feature_name: Name;
    importance: MlTotalFeatureImportanceStatistics[];
    classes: MlTotalFeatureImportanceClass[];
}
export interface MlTotalFeatureImportanceClass {
    class_name: Name;
    importance: MlTotalFeatureImportanceStatistics[];
}
export interface MlTotalFeatureImportanceStatistics {
    mean_magnitude: double;
    max: integer;
    min: integer;
}
export interface MlTrainedModelAssignment {
    assignment_state: MlDeploymentAssignmentState;
    max_assigned_allocations?: integer;
    routing_table: Record<string, MlTrainedModelAssignmentRoutingTable>;
    start_time: DateTime;
    task_parameters: MlTrainedModelAssignmentTaskParameters;
}
export interface MlTrainedModelAssignmentRoutingTable {
    reason: string;
    routing_state: MlRoutingState;
    current_allocations: integer;
    target_allocations: integer;
}
export interface MlTrainedModelAssignmentTaskParameters {
    model_bytes: integer;
    model_id: Id;
    deployment_id: Id;
    cache_size: ByteSize;
    number_of_allocations: integer;
    priority: MlTrainingPriority;
    queue_capacity: integer;
    threads_per_allocation: integer;
}
export interface MlTrainedModelConfig {
    model_id: Id;
    model_type?: MlTrainedModelType;
    tags: string[];
    version?: VersionString;
    compressed_definition?: string;
    created_by?: string;
    create_time?: DateTime;
    default_field_map?: Record<string, string>;
    description?: string;
    estimated_heap_memory_usage_bytes?: integer;
    estimated_operations?: integer;
    fully_defined?: boolean;
    inference_config?: MlInferenceConfigCreateContainer;
    input: MlTrainedModelConfigInput;
    license_level?: string;
    metadata?: MlTrainedModelConfigMetadata;
    model_size_bytes?: ByteSize;
    location?: MlTrainedModelLocation;
    prefix_strings?: MlTrainedModelPrefixStrings;
}
export interface MlTrainedModelConfigInput {
    field_names: Field[];
}
export interface MlTrainedModelConfigMetadata {
    model_aliases?: string[];
    feature_importance_baseline?: Record<string, string>;
    hyperparameters?: MlHyperparameter[];
    total_feature_importance?: MlTotalFeatureImportance[];
}
export interface MlTrainedModelDeploymentAllocationStatus {
    allocation_count: integer;
    state: MlDeploymentAllocationState;
    target_allocation_count: integer;
}
export interface MlTrainedModelDeploymentNodesStats {
    average_inference_time_ms: DurationValue<UnitFloatMillis>;
    error_count: integer;
    inference_count: integer;
    last_access: long;
    node: MlDiscoveryNode;
    number_of_allocations: integer;
    number_of_pending_requests: integer;
    rejection_execution_count: integer;
    routing_state: MlTrainedModelAssignmentRoutingTable;
    start_time: EpochTime<UnitMillis>;
    threads_per_allocation: integer;

}
export interface MlTrainedModelDeploymentStats {
    allocation_status: MlTrainedModelDeploymentAllocationStatus;
    cache_size?: ByteSize;
    deployment_id: Id;
    error_count: integer;
    inference_count: integer;
    model_id: Id;
    nodes: MlTrainedModelDeploymentNodesStats;
    number_of_allocations: integer;
    queue_capacity: integer;
    rejected_execution_count: integer;
    reason: string;
    start_time: EpochTime<UnitMillis>;
    state: MlDeploymentState;
    threads_per_allocation: integer;

}
export interface MlTrainedModelEntities {
    class_name: string;
    class_probability: double;
    entity: string;
    start_pos: integer;
    end_pos: integer;
}
export interface MlTrainedModelInferenceClassImportance {
    class_name: string;
    importance: double;
}
export interface MlTrainedModelInferenceFeatureImportance {
    feature_name: string;
    importance?: double;
    classes?: MlTrainedModelInferenceClassImportance[];
}
export interface MlTrainedModelInferenceStats {
    cache_miss_count: integer;
    failure_count: integer;
    inference_count: integer;
    missing_all_fields_count: integer;
    timestamp: DateTime;
}
export interface MlTrainedModelLocation {
    index: MlTrainedModelLocationIndex;
}
export interface MlTrainedModelLocationIndex {
    name: IndexName;
}
export interface MlTrainedModelPrefixStrings {
    ingest?: string;
    search?: string;
}
export interface MlTrainedModelSizeStats {
    model_size_bytes: ByteSize;
    required_native_memory_bytes: ByteSize;
}
export interface MlTrainedModelStats {
    deployment_stats?: MlTrainedModelDeploymentStats;
    inference_stats?: MlTrainedModelInferenceStats;
    ingest?: Record<string, any>;
    model_id: Id;
    model_size_stats: MlTrainedModelSizeStats;
    pipeline_count: integer;
}
export type MlTrainedModelType = 'tree_ensemble' | 'lang_ident' | 'pytorch';
export type MlTrainingPriority = 'normal' | 'low';
export interface MlTransformAuthorization {
    api_key?: MlApiKeyAuthorization;
    roles?: string[];
    service_account?: string;
}
export interface MlValidationLoss {
    fold_values: string[];
    loss_type: string;
}
export interface MlVocabulary {
    index: IndexName;
}
export interface MlZeroShotClassificationInferenceOptions {
    tokenization?: MlTokenizationConfigContainer;
    hypothesis_template?: string;
    classification_labels: string[];
    results_field?: string;
    multi_label?: boolean;
    labels?: string[];
}
export interface MlZeroShotClassificationInferenceUpdateOptions {
    tokenization?: MlNlpTokenizationUpdateOptions;
    results_field?: string;
    multi_label?: boolean;
    labels: string[];
}
export interface MlClearTrainedModelDeploymentCacheRequest extends RequestBase {
    model_id: Id;
}
export interface MlClearTrainedModelDeploymentCacheResponse {
    cleared: boolean;
}
export interface MlCloseJobRequest extends RequestBase {
    job_id: Id;
    allow_no_match?: boolean;
    force?: boolean;

}
export interface MlCloseJobResponse {
    closed: boolean;
}
export interface MlDeleteCalendarRequest extends RequestBase {
    calendar_id: Id;
}
export type MlDeleteCalendarResponse = AcknowledgedResponseBase;
export interface MlDeleteCalendarEventRequest extends RequestBase {
    calendar_id: Id;
    event_id: Id;
}
export type MlDeleteCalendarEventResponse = AcknowledgedResponseBase;
export interface MlDeleteCalendarJobRequest extends RequestBase {
    calendar_id: Id;
    job_id: Ids;
}
export interface MlDeleteCalendarJobResponse {
    calendar_id: Id;
    description?: string;
    job_ids: Ids;
}
export interface MlDeleteDataFrameAnalyticsRequest extends RequestBase {
    id: Id;
    force?: boolean;

}
export type MlDeleteDataFrameAnalyticsResponse = AcknowledgedResponseBase;
export interface MlDeleteDatafeedRequest extends RequestBase {
    datafeed_id: Id;
    force?: boolean;
}
export type MlDeleteDatafeedResponse = AcknowledgedResponseBase;
export interface MlDeleteExpiredDataRequest extends RequestBase {
    job_id?: Id;
    requests_per_second?: float;

}
export interface MlDeleteExpiredDataResponse {
    deleted: boolean;
}
export interface MlDeleteFilterRequest extends RequestBase {
    filter_id: Id;
}
export type MlDeleteFilterResponse = AcknowledgedResponseBase;
export interface MlDeleteForecastRequest extends RequestBase {
    job_id: Id;
    forecast_id?: Id;
    allow_no_forecasts?: boolean;

}
export type MlDeleteForecastResponse = AcknowledgedResponseBase;
export interface MlDeleteJobRequest extends RequestBase {
    job_id: Id;
    force?: boolean;
    delete_user_annotations?: boolean;
    wait_for_completion?: boolean;
}
export type MlDeleteJobResponse = AcknowledgedResponseBase;
export interface MlDeleteModelSnapshotRequest extends RequestBase {
    job_id: Id;
    snapshot_id: Id;
}
export type MlDeleteModelSnapshotResponse = AcknowledgedResponseBase;
export interface MlDeleteTrainedModelRequest extends RequestBase {
    model_id: Id;
    force?: boolean;
}
export type MlDeleteTrainedModelResponse = AcknowledgedResponseBase;
export interface MlDeleteTrainedModelAliasRequest extends RequestBase {
    model_alias: Name;
    model_id: Id;
}
export type MlDeleteTrainedModelAliasResponse = AcknowledgedResponseBase;
export interface MlEstimateModelMemoryRequest extends RequestBase {
    analysis_config?: MlAnalysisConfig;
    max_bucket_cardinality?: Record<Field, long>;
    overall_cardinality?: Record<Field, long>;
}
export interface MlEstimateModelMemoryResponse {
    model_memory_estimate: string;
}
export interface MlEvaluateDataFrameConfusionMatrixItem {
    actual_class: Name;
    actual_class_doc_count: integer;
    predicted_classes: MlEvaluateDataFrameConfusionMatrixPrediction[];
    other_predicted_class_doc_count: integer;
}
export interface MlEvaluateDataFrameConfusionMatrixPrediction {
    predicted_class: Name;
    count: integer;
}
export interface MlEvaluateDataFrameConfusionMatrixThreshold {
    tp: integer;
    fp: integer;
    tn: integer;
    fn: integer;
}
export interface MlEvaluateDataFrameDataframeClassificationSummary {
    auc_roc?: MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc;
    accuracy?: MlEvaluateDataFrameDataframeClassificationSummaryAccuracy;
    multiclass_confusion_matrix?: MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix;
    precision?: MlEvaluateDataFrameDataframeClassificationSummaryPrecision;
    recall?: MlEvaluateDataFrameDataframeClassificationSummaryRecall;
}
export interface MlEvaluateDataFrameDataframeClassificationSummaryAccuracy {
    classes: MlEvaluateDataFrameDataframeEvaluationClass[];
    overall_accuracy: double;
}
export interface MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix {
    confusion_matrix: MlEvaluateDataFrameConfusionMatrixItem[];
    other_actual_class_count: integer;
}
export interface MlEvaluateDataFrameDataframeClassificationSummaryPrecision {
    classes: MlEvaluateDataFrameDataframeEvaluationClass[];
    avg_precision: double;
}
export interface MlEvaluateDataFrameDataframeClassificationSummaryRecall {
    classes: MlEvaluateDataFrameDataframeEvaluationClass[];
    avg_recall: double;
}
export interface MlEvaluateDataFrameDataframeEvaluationClass extends MlEvaluateDataFrameDataframeEvaluationValue {
    class_name: Name;
}
export interface MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc extends MlEvaluateDataFrameDataframeEvaluationValue {
    curve?: MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem[];
}
export interface MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem {
    tpr: double;
    fpr: double;
    threshold: double;
}
export interface MlEvaluateDataFrameDataframeEvaluationValue {
    value: double;
}
export interface MlEvaluateDataFrameDataframeOutlierDetectionSummary {
    auc_roc?: MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc;
    precision?: Record<string, double>;
    recall?: Record<string, double>;
    confusion_matrix?: Record<string, MlEvaluateDataFrameConfusionMatrixThreshold>;
}
export interface MlEvaluateDataFrameDataframeRegressionSummary {
    huber?: MlEvaluateDataFrameDataframeEvaluationValue;
    mse?: MlEvaluateDataFrameDataframeEvaluationValue;
    msle?: MlEvaluateDataFrameDataframeEvaluationValue;
    r_squared?: MlEvaluateDataFrameDataframeEvaluationValue;
}
export interface MlEvaluateDataFrameRequest extends RequestBase {
    evaluation: MlDataframeEvaluationContainer;
    index: IndexName;
    query?: QueryDslQueryContainer;
}
export interface MlEvaluateDataFrameResponse {
    classification?: MlEvaluateDataFrameDataframeClassificationSummary;
    outlier_detection?: MlEvaluateDataFrameDataframeOutlierDetectionSummary;
    regression?: MlEvaluateDataFrameDataframeRegressionSummary;
}
export interface MlExplainDataFrameAnalyticsRequest extends RequestBase {
    id?: Id;
    source?: MlDataframeAnalyticsSource;
    dest?: MlDataframeAnalyticsDestination;
    analysis?: MlDataframeAnalysisContainer;
    description?: string;
    model_memory_limit?: string;
    max_num_threads?: integer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
    allow_lazy_start?: boolean;
}
export interface MlExplainDataFrameAnalyticsResponse {
    field_selection: MlDataframeAnalyticsFieldSelection[];
    memory_estimation: MlDataframeAnalyticsMemoryEstimation;
}
export interface MlFlushJobRequest extends RequestBase {
    job_id: Id;
    advance_time?: DateTime;
    calc_interim?: boolean;
    end?: DateTime;
    skip_time?: DateTime;
    start?: DateTime;
}
export interface MlFlushJobResponse {
    flushed: boolean;
    last_finalized_bucket_end?: integer;
}
export interface MlForecastRequest extends RequestBase {
    job_id: Id;
    duration?: Duration;
    expires_in?: Duration;
    max_model_memory?: string;
}
export interface MlForecastResponse {
    acknowledged: boolean;
    forecast_id: Id;
}
export interface MlGetBucketsRequest extends RequestBase {
    job_id: Id;
    timestamp?: DateTime;
    from?: integer;
    size?: integer;
    anomaly_score?: double;
    desc?: boolean;
    end?: DateTime;
    exclude_interim?: boolean;
    expand?: boolean;
    page?: MlPage;
    sort?: Field;
    start?: DateTime;
}
export interface MlGetBucketsResponse {
    buckets: MlBucketSummary[];
    count: long;
}
export interface MlGetCalendarEventsRequest extends RequestBase {
    calendar_id: Id;
    end?: DateTime;
    from?: integer;
    job_id?: Id;
    size?: integer;
    start?: DateTime;
}
export interface MlGetCalendarEventsResponse {
    count: long;
    events: MlCalendarEvent[];
}
export interface MlGetCalendarsCalendar {
    calendar_id: Id;
    description?: string;
    job_ids: Id[];
}
export interface MlGetCalendarsRequest extends RequestBase {
    calendar_id?: Id;
    from?: integer;
    size?: integer;
    page?: MlPage;
}
export interface MlGetCalendarsResponse {
    calendars: MlGetCalendarsCalendar[];
    count: long;
}
export interface MlGetCategoriesRequest extends RequestBase {
    job_id: Id;
    category_id?: CategoryId;
    from?: integer;
    partition_field_value?: string;
    size?: integer;
    page?: MlPage;
}
export interface MlGetCategoriesResponse {
    categories: MlCategory[];
    count: long;
}
export interface MlGetDataFrameAnalyticsRequest extends RequestBase {
    id?: Id;
    allow_no_match?: boolean;
    from?: integer;
    size?: integer;
    exclude_generated?: boolean;
}
export interface MlGetDataFrameAnalyticsResponse {
    count: integer;
    data_frame_analytics: MlDataframeAnalyticsSummary[];
}
export interface MlGetDataFrameAnalyticsStatsRequest extends RequestBase {
    id?: Id;
    allow_no_match?: boolean;
    from?: integer;
    size?: integer;
    verbose?: boolean;
}
export interface MlGetDataFrameAnalyticsStatsResponse {
    count: long;
    data_frame_analytics: MlDataframeAnalytics[];
}
export interface MlGetDatafeedStatsRequest extends RequestBase {
    datafeed_id?: Ids;
    allow_no_match?: boolean;
}
export interface MlGetDatafeedStatsResponse {
    count: long;
    datafeeds: MlDatafeedStats[];
}
export interface MlGetDatafeedsRequest extends RequestBase {
    datafeed_id?: Ids;
    allow_no_match?: boolean;
    exclude_generated?: boolean;
}
export interface MlGetDatafeedsResponse {
    count: long;
    datafeeds: MlDatafeed[];
}
export interface MlGetFiltersRequest extends RequestBase {
    filter_id?: Ids;
    from?: integer;
    size?: integer;
}
export interface MlGetFiltersResponse {
    count: long;
    filters: MlFilter[];
}
export interface MlGetInfluencersRequest extends RequestBase {
    job_id: Id;
    desc?: boolean;
    end?: DateTime;
    exclude_interim?: boolean;
    influencer_score?: double;
    from?: integer;
    size?: integer;
    sort?: Field;
    start?: DateTime;
    page?: MlPage;
}
export interface MlGetInfluencersResponse {
    count: long;
    influencers: MlInfluencer[];
}
export interface MlGetJobStatsRequest extends RequestBase {
    job_id?: Id;
    allow_no_match?: boolean;
}
export interface MlGetJobStatsResponse {
    count: long;
    jobs: MlJobStats[];
}
export interface MlGetJobsRequest extends RequestBase {
    job_id?: Ids;
    allow_no_match?: boolean;
    exclude_generated?: boolean;
}
export interface MlGetJobsResponse {
    count: long;
    jobs: MlJob[];
}
export interface MlGetMemoryStatsJvmStats {
    heap_max?: ByteSize;
    heap_max_in_bytes: integer;
    java_inference?: ByteSize;
    java_inference_in_bytes: integer;
    java_inference_max?: ByteSize;
    java_inference_max_in_bytes: integer;
}
export interface MlGetMemoryStatsMemMlStats {
    anomaly_detectors?: ByteSize;
    anomaly_detectors_in_bytes: integer;
    data_frame_analytics?: ByteSize;
    data_frame_analytics_in_bytes: integer;
    max?: ByteSize;
    max_in_bytes: integer;
    native_code_overhead?: ByteSize;
    native_code_overhead_in_bytes: integer;
    native_inference?: ByteSize;
    native_inference_in_bytes: integer;
}
export interface MlGetMemoryStatsMemStats {
    adjusted_total?: ByteSize;
    adjusted_total_in_bytes: integer;
    total?: ByteSize;
    total_in_bytes: integer;
    ml: MlGetMemoryStatsMemMlStats;
}
export interface MlGetMemoryStatsMemory {
    attributes: Record<string, string>;
    jvm: MlGetMemoryStatsJvmStats;
    mem: MlGetMemoryStatsMemStats;
    name: Name;
    roles: string[];
    transport_address: TransportAddress;
    ephemeral_id: Id;
}
export interface MlGetMemoryStatsRequest extends RequestBase {
    node_id?: Id;
    human?: boolean;


}
export interface MlGetMemoryStatsResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<Id, MlGetMemoryStatsMemory>;
}
export interface MlGetModelSnapshotUpgradeStatsRequest extends RequestBase {
    job_id: Id;
    snapshot_id: Id;
    allow_no_match?: boolean;
}
export interface MlGetModelSnapshotUpgradeStatsResponse {
    count: long;
    model_snapshot_upgrades: MlModelSnapshotUpgrade[];
}
export interface MlGetModelSnapshotsRequest extends RequestBase {
    job_id: Id;
    snapshot_id?: Id;
    from?: integer;
    size?: integer;
    desc?: boolean;
    end?: DateTime;
    page?: MlPage;
    sort?: Field;
    start?: DateTime;
}
export interface MlGetModelSnapshotsResponse {
    count: long;
    model_snapshots: MlModelSnapshot[];
}
export interface MlGetOverallBucketsRequest extends RequestBase {
    job_id: Id;
    allow_no_match?: boolean;
    bucket_span?: Duration;
    end?: DateTime;
    exclude_interim?: boolean;
    overall_score?: double | string;
    start?: DateTime;
    top_n?: integer;
}
export interface MlGetOverallBucketsResponse {
    count: long;
    overall_buckets: MlOverallBucket[];
}
export interface MlGetRecordsRequest extends RequestBase {
    job_id: Id;
    from?: integer;
    size?: integer;
    desc?: boolean;
    end?: DateTime;
    exclude_interim?: boolean;
    page?: MlPage;
    record_score?: double;
    sort?: Field;
    start?: DateTime;
}
export interface MlGetRecordsResponse {
    count: long;
    records: MlAnomaly[];
}
export interface MlGetTrainedModelsRequest extends RequestBase {
    model_id?: Ids;
    allow_no_match?: boolean;
    decompress_definition?: boolean;
    exclude_generated?: boolean;
    from?: integer;
    include?: MlInclude;
    size?: integer;
    tags?: string | string[];
}
export interface MlGetTrainedModelsResponse {
    count: integer;
    trained_model_configs: MlTrainedModelConfig[];
}
export interface MlGetTrainedModelsStatsRequest extends RequestBase {
    model_id?: Ids;
    allow_no_match?: boolean;
    from?: integer;
    size?: integer;
}
export interface MlGetTrainedModelsStatsResponse {
    count: integer;
    trained_model_stats: MlTrainedModelStats[];
}
export interface MlInferTrainedModelRequest extends RequestBase {
    model_id: Id;

    docs: Record<string, any>[];
    inference_config?: MlInferenceConfigUpdateContainer;
}
export interface MlInferTrainedModelResponse {
    inference_results: MlInferenceResponseResult[];
}
export interface MlInfoAnomalyDetectors {
    categorization_analyzer: MlCategorizationAnalyzer;
    categorization_examples_limit: integer;
    model_memory_limit: string;
    model_snapshot_retention_days: integer;
    daily_model_snapshot_retention_after_days: integer;
}
export interface MlInfoDatafeeds {
    scroll_size: integer;
}
export interface MlInfoDefaults {
    anomaly_detectors: MlInfoAnomalyDetectors;
    datafeeds: MlInfoDatafeeds;
}
export interface MlInfoLimits {
    max_model_memory_limit?: string;
    effective_max_model_memory_limit: string;
    total_ml_memory: string;
}
export interface MlInfoNativeCode {
    build_hash: string;
    version: VersionString;
}
export interface MlInfoRequest extends RequestBase {
}
export interface MlInfoResponse {
    defaults: MlInfoDefaults;
    limits: MlInfoLimits;
    upgrade_mode: boolean;
    native_code: MlInfoNativeCode;
}
export interface MlOpenJobRequest extends RequestBase {
    job_id: Id;

}
export interface MlOpenJobResponse {
    opened: boolean;
    node: NodeId;
}
export interface MlPostCalendarEventsRequest extends RequestBase {
    calendar_id: Id;
    events: MlCalendarEvent[];
}
export interface MlPostCalendarEventsResponse {
    events: MlCalendarEvent[];
}
export interface MlPostDataRequest<TData = unknown> extends RequestBase {
    job_id: Id;
    reset_end?: DateTime;
    reset_start?: DateTime;
    data?: TData[];
}
export interface MlPostDataResponse {
    bucket_count: long;
    earliest_record_timestamp: long;
    empty_bucket_count: long;
    input_bytes: long;
    input_field_count: long;
    input_record_count: long;
    invalid_date_count: long;
    job_id: Id;
    last_data_time: integer;
    latest_record_timestamp: long;
    missing_field_count: long;
    out_of_order_timestamp_count: long;
    processed_field_count: long;
    processed_record_count: long;
    sparse_bucket_count: long;
}
export interface MlPreviewDataFrameAnalyticsDataframePreviewConfig {
    source: MlDataframeAnalyticsSource;
    analysis: MlDataframeAnalysisContainer;
    model_memory_limit?: string;
    max_num_threads?: integer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
}
export interface MlPreviewDataFrameAnalyticsRequest extends RequestBase {
    id?: Id;
    config?: MlPreviewDataFrameAnalyticsDataframePreviewConfig;
}
export interface MlPreviewDataFrameAnalyticsResponse {
    feature_values: Record<Field, string>[];
}
export interface MlPreviewDatafeedRequest extends RequestBase {
    datafeed_id?: Id;
    start?: DateTime;
    end?: DateTime;
    datafeed_config?: MlDatafeedConfig;
    job_config?: MlJobConfig;
}
export type MlPreviewDatafeedResponse<TDocument = unknown> = TDocument[];
export interface MlPutCalendarRequest extends RequestBase {
    calendar_id: Id;
    job_ids?: Id[];
    description?: string;
}
export interface MlPutCalendarResponse {
    calendar_id: Id;
    description?: string;
    job_ids: Ids;
}
export interface MlPutCalendarJobRequest extends RequestBase {
    calendar_id: Id;
    job_id: Ids;
}
export interface MlPutCalendarJobResponse {
    calendar_id: Id;
    description?: string;
    job_ids: Ids;
}
export interface MlPutDataFrameAnalyticsRequest extends RequestBase {
    id: Id;
    allow_lazy_start?: boolean;
    analysis: MlDataframeAnalysisContainer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
    description?: string;
    dest: MlDataframeAnalyticsDestination;
    max_num_threads?: integer;
    model_memory_limit?: string;
    source: MlDataframeAnalyticsSource;
    headers?: HttpHeaders;
    version?: VersionString;
}
export interface MlPutDataFrameAnalyticsResponse {
    authorization?: MlDataframeAnalyticsAuthorization;
    allow_lazy_start: boolean;
    analysis: MlDataframeAnalysisContainer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
    create_time: EpochTime<UnitMillis>;
    description?: string;
    dest: MlDataframeAnalyticsDestination;
    id: Id;
    max_num_threads: integer;
    model_memory_limit: string;
    source: MlDataframeAnalyticsSource;
    version: VersionString;
}
export interface MlPutDatafeedRequest extends RequestBase {
    datafeed_id: Id;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    chunking_config?: MlChunkingConfig;
    delayed_data_check_config?: MlDelayedDataCheckConfig;
    frequency?: Duration;
    indices?: Indices;
    /** @alias indices */
    indexes?: Indices;
    indices_options?: IndicesOptions;
    job_id?: Id;
    max_empty_searches?: integer;
    query?: QueryDslQueryContainer;
    query_delay?: Duration;
    runtime_mappings?: MappingRuntimeFields;
    script_fields?: Record<string, ScriptField>;
    scroll_size?: integer;
    headers?: HttpHeaders;
}
export interface MlPutDatafeedResponse {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    authorization?: MlDatafeedAuthorization;
    chunking_config: MlChunkingConfig;
    delayed_data_check_config?: MlDelayedDataCheckConfig;
    datafeed_id: Id;
    frequency?: Duration;
    indices: string[];
    job_id: Id;
    indices_options?: IndicesOptions;
    max_empty_searches?: integer;
    query: QueryDslQueryContainer;
    query_delay: Duration;
    runtime_mappings?: MappingRuntimeFields;
    script_fields?: Record<string, ScriptField>;
    scroll_size: integer;
}
export interface MlPutFilterRequest extends RequestBase {
    filter_id: Id;
    description?: string;
    items?: string[];
}
export interface MlPutFilterResponse {
    description: string;
    filter_id: Id;
    items: string[];
}
export interface MlPutJobRequest extends RequestBase {
    job_id: Id;
    allow_lazy_open?: boolean;
    analysis_config: MlAnalysisConfig;
    analysis_limits?: MlAnalysisLimits;
    background_persist_interval?: Duration;
    custom_settings?: MlCustomSettings;
    daily_model_snapshot_retention_after_days?: long;
    data_description: MlDataDescription;
    datafeed_config?: MlDatafeedConfig;
    description?: string;
    groups?: string[];
    model_plot_config?: MlModelPlotConfig;
    model_snapshot_retention_days?: long;
    renormalization_window_days?: long;
    results_index_name?: IndexName;
    results_retention_days?: long;
}
export interface MlPutJobResponse {
    allow_lazy_open: boolean;
    analysis_config: MlAnalysisConfigRead;
    analysis_limits: MlAnalysisLimits;
    background_persist_interval?: Duration;
    create_time: DateTime;
    custom_settings?: MlCustomSettings;
    daily_model_snapshot_retention_after_days: long;
    data_description: MlDataDescription;
    datafeed_config?: MlDatafeed;
    description?: string;
    groups?: string[];
    job_id: Id;
    job_type: string;
    job_version: string;
    model_plot_config?: MlModelPlotConfig;
    model_snapshot_id?: Id;
    model_snapshot_retention_days: long;
    renormalization_window_days?: long;
    results_index_name: string;
    results_retention_days?: long;
}
export interface MlPutTrainedModelAggregateOutput {
    logistic_regression?: MlPutTrainedModelWeights;
    weighted_sum?: MlPutTrainedModelWeights;
    weighted_mode?: MlPutTrainedModelWeights;
    exponent?: MlPutTrainedModelWeights;
}
export interface MlPutTrainedModelDefinition {
    preprocessors?: MlPutTrainedModelPreprocessor[];
    trained_model: MlPutTrainedModelTrainedModel;
}
export interface MlPutTrainedModelEnsemble {
    aggregate_output?: MlPutTrainedModelAggregateOutput;
    classification_labels?: string[];
    feature_names?: string[];
    target_type?: string;
    trained_models: MlPutTrainedModelTrainedModel[];
}
export interface MlPutTrainedModelFrequencyEncodingPreprocessor {
    field: string;
    feature_name: string;
    frequency_map: Record<string, double>;
}
export interface MlPutTrainedModelInput {
    field_names: Names;
}
export interface MlPutTrainedModelOneHotEncodingPreprocessor {
    field: string;
    hot_map: Record<string, string>;
}
export interface MlPutTrainedModelPreprocessor {
    frequency_encoding?: MlPutTrainedModelFrequencyEncodingPreprocessor;
    one_hot_encoding?: MlPutTrainedModelOneHotEncodingPreprocessor;
    target_mean_encoding?: MlPutTrainedModelTargetMeanEncodingPreprocessor;
}
export interface MlPutTrainedModelRequest extends RequestBase {
    model_id: Id;
    defer_definition_decompression?: boolean;
    wait_for_completion?: boolean;
    compressed_definition?: string;
    definition?: MlPutTrainedModelDefinition;
    description?: string;
    inference_config?: MlInferenceConfigCreateContainer;
    input?: MlPutTrainedModelInput;
    metadata?: any;
    model_type?: MlTrainedModelType;
    model_size_bytes?: long;
    platform_architecture?: string;
    tags?: string[];
    prefix_strings?: MlTrainedModelPrefixStrings;
}
export type MlPutTrainedModelResponse = MlTrainedModelConfig;
export interface MlPutTrainedModelTargetMeanEncodingPreprocessor {
    field: string;
    feature_name: string;
    target_map: Record<string, double>;
    default_value: double;
}
export interface MlPutTrainedModelTrainedModel {
    tree?: MlPutTrainedModelTrainedModelTree;
    tree_node?: MlPutTrainedModelTrainedModelTreeNode;
    ensemble?: MlPutTrainedModelEnsemble;
}
export interface MlPutTrainedModelTrainedModelTree {
    classification_labels?: string[];
    feature_names: string[];
    target_type?: string;
    tree_structure: MlPutTrainedModelTrainedModelTreeNode[];
}
export interface MlPutTrainedModelTrainedModelTreeNode {
    decision_type?: string;
    default_left?: boolean;
    leaf_value?: double;
    left_child?: integer;
    node_index: integer;
    right_child?: integer;
    split_feature?: integer;
    split_gain?: integer;
    threshold?: double;
}
export interface MlPutTrainedModelWeights {
    weights: double;
}
export interface MlPutTrainedModelAliasRequest extends RequestBase {
    model_alias: Name;
    model_id: Id;
    reassign?: boolean;
}
export type MlPutTrainedModelAliasResponse = AcknowledgedResponseBase;
export interface MlPutTrainedModelDefinitionPartRequest extends RequestBase {
    model_id: Id;
    part: integer;
    definition: string;
    total_definition_length: long;
    total_parts: integer;
}
export type MlPutTrainedModelDefinitionPartResponse = AcknowledgedResponseBase;
export interface MlPutTrainedModelVocabularyRequest extends RequestBase {
    model_id: Id;
    vocabulary: string[];
    merges?: string[];
    scores?: double[];
}
export type MlPutTrainedModelVocabularyResponse = AcknowledgedResponseBase;
export interface MlResetJobRequest extends RequestBase {
    job_id: Id;
    wait_for_completion?: boolean;
    delete_user_annotations?: boolean;
}
export type MlResetJobResponse = AcknowledgedResponseBase;
export interface MlRevertModelSnapshotRequest extends RequestBase {
    job_id: Id;
    snapshot_id: Id;
    delete_intervening_results?: boolean;
}
export interface MlRevertModelSnapshotResponse {
    model: MlModelSnapshot;
}
export interface MlSetUpgradeModeRequest extends RequestBase {
    enabled?: boolean;

}
export type MlSetUpgradeModeResponse = AcknowledgedResponseBase;
export interface MlStartDataFrameAnalyticsRequest extends RequestBase {
    id: Id;

}
export interface MlStartDataFrameAnalyticsResponse {
    acknowledged: boolean;
    node: NodeId;
}
export interface MlStartDatafeedRequest extends RequestBase {
    datafeed_id: Id;
    end?: DateTime;
    start?: DateTime;

}
export interface MlStartDatafeedResponse {
    node: NodeIds;
    started: boolean;
}
export interface MlStartTrainedModelDeploymentRequest extends RequestBase {
    model_id: Id;
    cache_size?: ByteSize;
    deployment_id?: string;
    number_of_allocations?: integer;
    priority?: MlTrainingPriority;
    queue_capacity?: integer;
    threads_per_allocation?: integer;

    wait_for?: MlDeploymentAllocationState;
}
export interface MlStartTrainedModelDeploymentResponse {
    assignment: MlTrainedModelAssignment;
}
export interface MlStopDataFrameAnalyticsRequest extends RequestBase {
    id: Id;
    allow_no_match?: boolean;
    force?: boolean;

}
export interface MlStopDataFrameAnalyticsResponse {
    stopped: boolean;
}
export interface MlStopDatafeedRequest extends RequestBase {
    datafeed_id: Id;
    allow_no_match?: boolean;
    force?: boolean;

}
export interface MlStopDatafeedResponse {
    stopped: boolean;
}
export interface MlStopTrainedModelDeploymentRequest extends RequestBase {
    model_id: Id;
    allow_no_match?: boolean;
    force?: boolean;
}
export interface MlStopTrainedModelDeploymentResponse {
    stopped: boolean;
}
export interface MlUpdateDataFrameAnalyticsRequest extends RequestBase {
    id: Id;
    description?: string;
    model_memory_limit?: string;
    max_num_threads?: integer;
    allow_lazy_start?: boolean;
}
export interface MlUpdateDataFrameAnalyticsResponse {
    authorization?: MlDataframeAnalyticsAuthorization;
    allow_lazy_start: boolean;
    analysis: MlDataframeAnalysisContainer;
    analyzed_fields?: MlDataframeAnalysisAnalyzedFields | string[];
    create_time: long;
    description?: string;
    dest: MlDataframeAnalyticsDestination;
    id: Id;
    max_num_threads: integer;
    model_memory_limit: string;
    source: MlDataframeAnalyticsSource;
    version: VersionString;
}
export interface MlUpdateDatafeedRequest extends RequestBase {
    datafeed_id: Id;
    allow_no_indices?: boolean;
    expand_wildcards?: ExpandWildcards;
    ignore_throttled?: boolean;
    ignore_unavailable?: boolean;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    chunking_config?: MlChunkingConfig;
    delayed_data_check_config?: MlDelayedDataCheckConfig;
    frequency?: Duration;
    indices?: string[];
    /** @alias indices */
    indexes?: string[];
    indices_options?: IndicesOptions;
    job_id?: Id;
    max_empty_searches?: integer;
    query?: QueryDslQueryContainer;
    query_delay?: Duration;
    runtime_mappings?: MappingRuntimeFields;
    script_fields?: Record<string, ScriptField>;
    scroll_size?: integer;
}
export interface MlUpdateDatafeedResponse {
    authorization?: MlDatafeedAuthorization;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    chunking_config: MlChunkingConfig;
    delayed_data_check_config?: MlDelayedDataCheckConfig;
    datafeed_id: Id;
    frequency?: Duration;
    indices: string[];
    indices_options?: IndicesOptions;
    job_id: Id;
    max_empty_searches?: integer;
    query: QueryDslQueryContainer;
    query_delay: Duration;
    runtime_mappings?: MappingRuntimeFields;
    script_fields?: Record<string, ScriptField>;
    scroll_size: integer;
}
export interface MlUpdateFilterRequest extends RequestBase {
    filter_id: Id;
    add_items?: string[];
    description?: string;
    remove_items?: string[];
}
export interface MlUpdateFilterResponse {
    description: string;
    filter_id: Id;
    items: string[];
}
export interface MlUpdateJobRequest extends RequestBase {
    job_id: Id;
    allow_lazy_open?: boolean;
    analysis_limits?: MlAnalysisMemoryLimit;
    background_persist_interval?: Duration;
    custom_settings?: Record<string, any>;
    categorization_filters?: string[];
    description?: string;
    model_plot_config?: MlModelPlotConfig;
    model_prune_window?: Duration;
    daily_model_snapshot_retention_after_days?: long;
    model_snapshot_retention_days?: long;
    renormalization_window_days?: long;
    results_retention_days?: long;
    groups?: string[];
    detectors?: MlDetector[];
    per_partition_categorization?: MlPerPartitionCategorization;
}
export interface MlUpdateJobResponse {
    allow_lazy_open: boolean;
    analysis_config: MlAnalysisConfigRead;
    analysis_limits: MlAnalysisLimits;
    background_persist_interval?: Duration;
    create_time: EpochTime<UnitMillis>;
    finished_time?: EpochTime<UnitMillis>;
    custom_settings?: Record<string, string>;
    daily_model_snapshot_retention_after_days: long;
    data_description: MlDataDescription;
    datafeed_config?: MlDatafeed;
    description?: string;
    groups?: string[];
    job_id: Id;
    job_type: string;
    job_version: VersionString;
    model_plot_config?: MlModelPlotConfig;
    model_snapshot_id?: Id;
    model_snapshot_retention_days: long;
    renormalization_window_days?: long;
    results_index_name: IndexName;
    results_retention_days?: long;
}
export interface MlUpdateModelSnapshotRequest extends RequestBase {
    job_id: Id;
    snapshot_id: Id;
    description?: string;
    retain?: boolean;
}
export interface MlUpdateModelSnapshotResponse {
    acknowledged: boolean;
    model: MlModelSnapshot;
}
export interface MlUpdateTrainedModelDeploymentRequest extends RequestBase {
    model_id: Id;
    number_of_allocations?: integer;
}
export interface MlUpdateTrainedModelDeploymentResponse {
    assignment: MlTrainedModelAssignment;
}
export interface MlUpgradeJobSnapshotRequest extends RequestBase {
    job_id: Id;
    snapshot_id: Id;
    wait_for_completion?: boolean;

}
export interface MlUpgradeJobSnapshotResponse {
    node: NodeId;
    completed: boolean;
}
export interface MlValidateRequest extends RequestBase {
    job_id?: Id;
    analysis_config?: MlAnalysisConfig;
    analysis_limits?: MlAnalysisLimits;
    data_description?: MlDataDescription;
    description?: string;
    model_plot?: MlModelPlotConfig;
    model_snapshot_id?: Id;
    model_snapshot_retention_days?: long;
    results_index_name?: IndexName;
}
export type MlValidateResponse = AcknowledgedResponseBase;
export interface MlValidateDetectorRequest extends RequestBase {
    detector?: MlDetector;
}
export type MlValidateDetectorResponse = AcknowledgedResponseBase;
export interface MonitoringBulkRequest<TDocument = unknown, TPartialDocument = unknown> extends RequestBase {
    type?: string;
    system_id: string;
    system_api_version: string;
    interval: Duration;
    operations?: (BulkOperationContainer | BulkUpdateAction<TDocument, TPartialDocument> | TDocument)[];
}
export interface MonitoringBulkResponse {
    error?: ErrorCause;
    errors: boolean;
    ignored: boolean;
    took: long;
}
export interface NodesAdaptiveSelection {
    avg_queue_size?: long;
    avg_response_time?: Duration;
    avg_response_time_ns?: long;
    avg_service_time?: Duration;
    avg_service_time_ns?: long;
    outgoing_searches?: long;
    rank?: string;
}
export interface NodesBreaker {
    estimated_size?: string;
    estimated_size_in_bytes?: long;
    limit_size?: string;
    limit_size_in_bytes?: long;
    overhead?: float;
    tripped?: float;
}
export interface NodesCgroup {
    cpuacct?: NodesCpuAcct;
    cpu?: NodesCgroupCpu;
    memory?: NodesCgroupMemory;
}
export interface NodesCgroupCpu {
    control_group?: string;
    cfs_period_micros?: integer;
    cfs_quota_micros?: integer;
    stat?: NodesCgroupCpuStat;
}
export interface NodesCgroupCpuStat {
    number_of_elapsed_periods?: long;
    number_of_times_throttled?: long;
    time_throttled_nanos?: DurationValue<UnitNanos>;
}
export interface NodesCgroupMemory {
    control_group?: string;
    limit_in_bytes?: string;
    usage_in_bytes?: string;
}
export interface NodesClient {
    id?: long;
    agent?: string;
    local_address?: string;
    remote_address?: string;
    last_uri?: string;
    opened_time_millis?: long;
    closed_time_millis?: long;
    last_request_time_millis?: long;
    request_count?: long;
    request_size_bytes?: long;
    x_opaque_id?: string;
}
export interface NodesClusterAppliedStats {
    recordings?: NodesRecording[];
}
export interface NodesClusterStateQueue {
    total?: long;
    pending?: long;
    committed?: long;
}
export interface NodesClusterStateUpdate {
    count: long;
    computation_time?: Duration;
    computation_time_millis?: DurationValue<UnitMillis>;
    publication_time?: Duration;
    publication_time_millis?: DurationValue<UnitMillis>;
    context_construction_time?: Duration;
    context_construction_time_millis?: DurationValue<UnitMillis>;
    commit_time?: Duration;
    commit_time_millis?: DurationValue<UnitMillis>;
    completion_time?: Duration;
    completion_time_millis?: DurationValue<UnitMillis>;
    master_apply_time?: Duration;
    master_apply_time_millis?: DurationValue<UnitMillis>;
    notification_time?: Duration;
    notification_time_millis?: DurationValue<UnitMillis>;
}
export interface NodesContext {
    context?: string;
    compilations?: long;
    cache_evictions?: long;
    compilation_limit_triggered?: long;
}
export interface NodesCpu {
    percent?: integer;
    sys?: Duration;
    sys_in_millis?: DurationValue<UnitMillis>;
    total?: Duration;
    total_in_millis?: DurationValue<UnitMillis>;
    user?: Duration;
    user_in_millis?: DurationValue<UnitMillis>;
    load_average?: Record<string, double>;
}
export interface NodesCpuAcct {
    control_group?: string;
    usage_nanos?: DurationValue<UnitNanos>;
}
export interface NodesDataPathStats {
    available?: string;
    available_in_bytes?: long;
    disk_queue?: string;
    disk_reads?: long;
    disk_read_size?: string;
    disk_read_size_in_bytes?: long;
    disk_writes?: long;
    disk_write_size?: string;
    disk_write_size_in_bytes?: long;
    free?: string;
    free_in_bytes?: long;
    mount?: string;
    path?: string;
    total?: string;
    total_in_bytes?: long;
    type?: string;
}
export interface NodesDiscovery {
    cluster_state_queue?: NodesClusterStateQueue;
    published_cluster_states?: NodesPublishedClusterStates;
    cluster_state_update?: Record<string, NodesClusterStateUpdate>;
    serialized_cluster_states?: NodesSerializedClusterState;
    cluster_applier_stats?: NodesClusterAppliedStats;
}
export interface NodesExtendedMemoryStats extends NodesMemoryStats {
    free_percent?: integer;
    used_percent?: integer;
}
export interface NodesFileSystem {
    data?: NodesDataPathStats[];
    timestamp?: long;
    total?: NodesFileSystemTotal;
    io_stats?: NodesIoStats;
}
export interface NodesFileSystemTotal {
    available?: string;
    available_in_bytes?: long;
    free?: string;
    free_in_bytes?: long;
    total?: string;
    total_in_bytes?: long;
}
export interface NodesGarbageCollector {
    collectors?: Record<string, NodesGarbageCollectorTotal>;
}
export interface NodesGarbageCollectorTotal {
    collection_count?: long;
    collection_time?: string;
    collection_time_in_millis?: long;
}
export interface NodesHttp {
    current_open?: integer;
    total_opened?: long;
    clients?: NodesClient[];
}
export interface NodesIndexingPressure {
    memory?: NodesIndexingPressureMemory;
}
export interface NodesIndexingPressureMemory {
    limit?: ByteSize;
    limit_in_bytes?: long;
    current?: NodesPressureMemory;
    total?: NodesPressureMemory;
}
export interface NodesIngest {
    pipelines?: Record<string, NodesIngestTotal>;
    total?: NodesIngestTotal;
}
export interface NodesIngestTotal {
    count?: long;
    current?: long;
    failed?: long;
    processors?: Record<string, NodesKeyedProcessor>[];
    time_in_millis?: DurationValue<UnitMillis>;
}
export interface NodesIoStatDevice {
    device_name?: string;
    operations?: long;
    read_kilobytes?: long;
    read_operations?: long;
    write_kilobytes?: long;
    write_operations?: long;
}
export interface NodesIoStats {
    devices?: NodesIoStatDevice[];
    total?: NodesIoStatDevice;
}
export interface NodesJvm {
    buffer_pools?: Record<string, NodesNodeBufferPool>;
    classes?: NodesJvmClasses;
    gc?: NodesGarbageCollector;
    mem?: NodesJvmMemoryStats;
    threads?: NodesJvmThreads;
    timestamp?: long;
    uptime?: string;
    uptime_in_millis?: long;
}
export interface NodesJvmClasses {
    current_loaded_count?: long;
    total_loaded_count?: long;
    total_unloaded_count?: long;
}
export interface NodesJvmMemoryStats {
    heap_used_in_bytes?: long;
    heap_used_percent?: long;
    heap_committed_in_bytes?: long;
    heap_max_in_bytes?: long;
    non_heap_used_in_bytes?: long;
    non_heap_committed_in_bytes?: long;
    pools?: Record<string, NodesPool>;
}
export interface NodesJvmThreads {
    count?: long;
    peak_count?: long;
}
export interface NodesKeyedProcessor {
    stats?: NodesProcessor;
    type?: string;
}
export interface NodesMemoryStats {
    adjusted_total_in_bytes?: long;
    resident?: string;
    resident_in_bytes?: long;
    share?: string;
    share_in_bytes?: long;
    total_virtual?: string;
    total_virtual_in_bytes?: long;
    total_in_bytes?: long;
    free_in_bytes?: long;
    used_in_bytes?: long;
}
export interface NodesNodeBufferPool {
    count?: long;
    total_capacity?: string;
    total_capacity_in_bytes?: long;
    used?: string;
    used_in_bytes?: long;
}
export interface NodesNodeReloadError {
    name: Name;
    reload_exception?: ErrorCause;
}
export type NodesNodeReloadResult = NodesStats | NodesNodeReloadError;
export interface NodesNodesResponseBase {
    _nodes?: NodeStatistics;
}
export interface NodesOperatingSystem {
    cpu?: NodesCpu;
    mem?: NodesExtendedMemoryStats;
    swap?: NodesMemoryStats;
    cgroup?: NodesCgroup;
    timestamp?: long;
}
export interface NodesPool {
    used_in_bytes?: long;
    max_in_bytes?: long;
    peak_used_in_bytes?: long;
    peak_max_in_bytes?: long;
}
export interface NodesPressureMemory {
    all?: ByteSize;
    all_in_bytes?: long;
    combined_coordinating_and_primary?: ByteSize;
    combined_coordinating_and_primary_in_bytes?: long;
    coordinating?: ByteSize;
    coordinating_in_bytes?: long;
    primary?: ByteSize;
    primary_in_bytes?: long;
    replica?: ByteSize;
    replica_in_bytes?: long;
    coordinating_rejections?: long;
    primary_rejections?: long;
    replica_rejections?: long;
}
export interface NodesProcess {
    cpu?: NodesCpu;
    mem?: NodesMemoryStats;
    open_file_descriptors?: integer;
    max_file_descriptors?: integer;
    timestamp?: long;
}
export interface NodesProcessor {
    count?: long;
    current?: long;
    failed?: long;
    time_in_millis?: DurationValue<UnitMillis>;
}
export interface NodesPublishedClusterStates {
    full_states?: long;
    incompatible_diffs?: long;
    compatible_diffs?: long;
}
export interface NodesRecording {
    name?: string;
    cumulative_execution_count?: long;
    cumulative_execution_time?: Duration;
    cumulative_execution_time_millis?: DurationValue<UnitMillis>;
}
export interface NodesRepositoryLocation {
    base_path: string;
    container?: string;
    bucket?: string;
}
export interface NodesRepositoryMeteringInformation {
    repository_name: Name;
    repository_type: string;
    repository_location: NodesRepositoryLocation;
    repository_ephemeral_id: Id;
    repository_started_at: EpochTime<UnitMillis>;
    repository_stopped_at?: EpochTime<UnitMillis>;
    archived: boolean;
    cluster_version?: VersionNumber;
    request_counts: NodesRequestCounts;
}
export interface NodesRequestCounts {
    GetBlobProperties?: long;
    GetBlob?: long;
    ListBlobs?: long;
    PutBlob?: long;
    PutBlock?: long;
    PutBlockList?: long;
    GetObject?: long;
    ListObjects?: long;
    InsertObject?: long;
    PutObject?: long;
    PutMultipartObject?: long;
}
export interface NodesScriptCache {
    cache_evictions?: long;
    compilation_limit_triggered?: long;
    compilations?: long;
    context?: string;
}
export interface NodesScripting {
    cache_evictions?: long;
    compilations?: long;
    compilations_history?: Record<string, long>;
    compilation_limit_triggered?: long;
    contexts?: NodesContext[];
}
export interface NodesSerializedClusterState {
    full_states?: NodesSerializedClusterStateDetail;
    diffs?: NodesSerializedClusterStateDetail;
}
export interface NodesSerializedClusterStateDetail {
    count?: long;
    uncompressed_size?: string;
    uncompressed_size_in_bytes?: long;
    compressed_size?: string;
    compressed_size_in_bytes?: long;
}
export interface NodesStats {
    adaptive_selection?: Record<string, NodesAdaptiveSelection>;
    breakers?: Record<string, NodesBreaker>;
    fs?: NodesFileSystem;
    host?: Host;
    http?: NodesHttp;
    ingest?: NodesIngest;
    ip?: Ip | Ip[];
    jvm?: NodesJvm;
    name?: Name;
    os?: NodesOperatingSystem;
    process?: NodesProcess;
    roles?: NodeRoles;
    script?: NodesScripting;
    script_cache?: Record<string, NodesScriptCache | NodesScriptCache[]>;
    thread_pool?: Record<string, NodesThreadCount>;
    timestamp?: long;
    transport?: NodesTransport;
    transport_address?: TransportAddress;
    attributes?: Record<Field, string>;
    discovery?: NodesDiscovery;
    indexing_pressure?: NodesIndexingPressure;
    indices?: IndicesStatsShardStats;
}
export interface NodesThreadCount {
    active?: long;
    completed?: long;
    largest?: long;
    queue?: long;
    rejected?: long;
    threads?: long;
}
export interface NodesTransport {
    inbound_handling_time_histogram?: NodesTransportHistogram[];
    outbound_handling_time_histogram?: NodesTransportHistogram[];
    rx_count?: long;
    rx_size?: string;
    rx_size_in_bytes?: long;
    server_open?: integer;
    tx_count?: long;
    tx_size?: string;
    tx_size_in_bytes?: long;
    total_outbound_connections?: long;
}
export interface NodesTransportHistogram {
    count?: long;
    lt_millis?: long;
    ge_millis?: long;
}
export interface NodesClearRepositoriesMeteringArchiveRequest extends RequestBase {
    node_id: NodeIds;
    max_archive_version: long;
}
export type NodesClearRepositoriesMeteringArchiveResponse = NodesClearRepositoriesMeteringArchiveResponseBase;
export interface NodesClearRepositoriesMeteringArchiveResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    nodes: Record<string, NodesRepositoryMeteringInformation>;
}
export interface NodesGetRepositoriesMeteringInfoRequest extends RequestBase {
    node_id: NodeIds;
}
export type NodesGetRepositoriesMeteringInfoResponse = NodesGetRepositoriesMeteringInfoResponseBase;
export interface NodesGetRepositoriesMeteringInfoResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    nodes: Record<string, NodesRepositoryMeteringInformation>;
}
export interface NodesHotThreadsHotThread {
    hosts: Host[];
    node_id: Id;
    node_name: Name;
    threads: string[];
}
export interface NodesHotThreadsRequest extends RequestBase {
    node_id?: NodeIds;
    ignore_idle_threads?: boolean;
    interval?: Duration;
    snapshots?: long;

    threads?: long;

    type?: ThreadType;
    sort?: ThreadType;
}
export interface NodesHotThreadsResponse {
    hot_threads: NodesHotThreadsHotThread[];
}
export interface NodesInfoDeprecationIndexing {
    enabled: boolean | string;
}
export interface NodesInfoNodeInfo {
    attributes: Record<string, string>;
    build_flavor: string;
    build_hash: string;
    build_type: string;
    host: Host;
    http?: NodesInfoNodeInfoHttp;
    ip: Ip;
    jvm?: NodesInfoNodeJvmInfo;
    name: Name;
    network?: NodesInfoNodeInfoNetwork;
    os?: NodesInfoNodeOperatingSystemInfo;
    plugins?: PluginStats[];
    process?: NodesInfoNodeProcessInfo;
    roles: NodeRoles;
    settings?: NodesInfoNodeInfoSettings;
    thread_pool?: Record<string, NodesInfoNodeThreadPoolInfo>;
    total_indexing_buffer?: long;
    total_indexing_buffer_in_bytes?: ByteSize;
    transport?: NodesInfoNodeInfoTransport;
    transport_address: TransportAddress;
    version: VersionString;
    modules?: PluginStats[];
    ingest?: NodesInfoNodeInfoIngest;
    aggregations?: Record<string, NodesInfoNodeInfoAggregation>;
}
export interface NodesInfoNodeInfoAction {
    destructive_requires_name: string;
}
export interface NodesInfoNodeInfoAggregation {
    types: string[];
}
export interface NodesInfoNodeInfoBootstrap {
    memory_lock: string;
}
export interface NodesInfoNodeInfoClient {
    type: string;
}
export interface NodesInfoNodeInfoDiscoverKeys {
    seed_hosts?: string[];
    type?: string;
    seed_providers?: string[];
}
export type NodesInfoNodeInfoDiscover = NodesInfoNodeInfoDiscoverKeys & {
    [property: string]: any;
};
export interface NodesInfoNodeInfoHttp {
    bound_address: string[];
    max_content_length?: ByteSize;
    max_content_length_in_bytes: long;
    publish_address: string;
}
export interface NodesInfoNodeInfoIngest {
    processors: NodesInfoNodeInfoIngestProcessor[];
}
export interface NodesInfoNodeInfoIngestDownloader {
    enabled: string;
}
export interface NodesInfoNodeInfoIngestInfo {
    downloader: NodesInfoNodeInfoIngestDownloader;
}
export interface NodesInfoNodeInfoIngestProcessor {
    type: string;
}
export interface NodesInfoNodeInfoJvmMemory {
    direct_max?: ByteSize;
    direct_max_in_bytes: long;
    heap_init?: ByteSize;
    heap_init_in_bytes: long;
    heap_max?: ByteSize;
    heap_max_in_bytes: long;
    non_heap_init?: ByteSize;
    non_heap_init_in_bytes: long;
    non_heap_max?: ByteSize;
    non_heap_max_in_bytes: long;
}
export interface NodesInfoNodeInfoMemory {
    total: string;
    total_in_bytes: long;
}
export interface NodesInfoNodeInfoNetwork {
    primary_interface: NodesInfoNodeInfoNetworkInterface;
    refresh_interval: integer;
}
export interface NodesInfoNodeInfoNetworkInterface {
    address: string;
    mac_address: string;
    name: Name;
}
export interface NodesInfoNodeInfoOSCPU {
    cache_size: string;
    cache_size_in_bytes: integer;
    cores_per_socket: integer;
    mhz: integer;
    model: string;
    total_cores: integer;
    total_sockets: integer;
    vendor: string;
}
export interface NodesInfoNodeInfoPath {
    logs?: string;
    home?: string;
    repo?: string[];
    data?: string[];
}
export interface NodesInfoNodeInfoRepositories {
    url: NodesInfoNodeInfoRepositoriesUrl;
}
export interface NodesInfoNodeInfoRepositoriesUrl {
    allowed_urls: string;
}
export interface NodesInfoNodeInfoScript {
    allowed_types: string;
    disable_max_compilations_rate?: string;
}
export interface NodesInfoNodeInfoSearch {
    remote: NodesInfoNodeInfoSearchRemote;
}
export interface NodesInfoNodeInfoSearchRemote {
    connect: string;
}
export interface NodesInfoNodeInfoSettings {
    cluster: NodesInfoNodeInfoSettingsCluster;
    node: NodesInfoNodeInfoSettingsNode;
    path?: NodesInfoNodeInfoPath;
    repositories?: NodesInfoNodeInfoRepositories;
    discovery?: NodesInfoNodeInfoDiscover;
    action?: NodesInfoNodeInfoAction;
    client?: NodesInfoNodeInfoClient;
    http: NodesInfoNodeInfoSettingsHttp;
    bootstrap?: NodesInfoNodeInfoBootstrap;
    transport: NodesInfoNodeInfoSettingsTransport;
    network?: NodesInfoNodeInfoSettingsNetwork;
    xpack?: NodesInfoNodeInfoXpack;
    script?: NodesInfoNodeInfoScript;
    search?: NodesInfoNodeInfoSearch;
    ingest?: NodesInfoNodeInfoSettingsIngest;
}
export interface NodesInfoNodeInfoSettingsCluster {
    name: Name;
    routing?: IndicesIndexRouting;
    election: NodesInfoNodeInfoSettingsClusterElection;
    initial_master_nodes?: string[];
    deprecation_indexing?: NodesInfoDeprecationIndexing;
}
export interface NodesInfoNodeInfoSettingsClusterElection {
    strategy: Name;
}
export interface NodesInfoNodeInfoSettingsHttp {
    type: NodesInfoNodeInfoSettingsHttpType | string;
    'type.default'?: string;
    compression?: boolean | string;
    port?: integer | string;
}
export interface NodesInfoNodeInfoSettingsHttpType {
    default: string;
}
export interface NodesInfoNodeInfoSettingsIngest {
    attachment?: NodesInfoNodeInfoIngestInfo;
    append?: NodesInfoNodeInfoIngestInfo;
    csv?: NodesInfoNodeInfoIngestInfo;
    convert?: NodesInfoNodeInfoIngestInfo;
    date?: NodesInfoNodeInfoIngestInfo;
    date_index_name?: NodesInfoNodeInfoIngestInfo;
    dot_expander?: NodesInfoNodeInfoIngestInfo;
    enrich?: NodesInfoNodeInfoIngestInfo;
    fail?: NodesInfoNodeInfoIngestInfo;
    foreach?: NodesInfoNodeInfoIngestInfo;
    json?: NodesInfoNodeInfoIngestInfo;
    user_agent?: NodesInfoNodeInfoIngestInfo;
    kv?: NodesInfoNodeInfoIngestInfo;
    geoip?: NodesInfoNodeInfoIngestInfo;
    grok?: NodesInfoNodeInfoIngestInfo;
    gsub?: NodesInfoNodeInfoIngestInfo;
    join?: NodesInfoNodeInfoIngestInfo;
    lowercase?: NodesInfoNodeInfoIngestInfo;
    remove?: NodesInfoNodeInfoIngestInfo;
    rename?: NodesInfoNodeInfoIngestInfo;
    script?: NodesInfoNodeInfoIngestInfo;
    set?: NodesInfoNodeInfoIngestInfo;
    sort?: NodesInfoNodeInfoIngestInfo;
    split?: NodesInfoNodeInfoIngestInfo;
    trim?: NodesInfoNodeInfoIngestInfo;
    uppercase?: NodesInfoNodeInfoIngestInfo;
    urldecode?: NodesInfoNodeInfoIngestInfo;
    bytes?: NodesInfoNodeInfoIngestInfo;
    dissect?: NodesInfoNodeInfoIngestInfo;
    set_security_user?: NodesInfoNodeInfoIngestInfo;
    pipeline?: NodesInfoNodeInfoIngestInfo;
    drop?: NodesInfoNodeInfoIngestInfo;
    circle?: NodesInfoNodeInfoIngestInfo;
    inference?: NodesInfoNodeInfoIngestInfo;
}
export interface NodesInfoNodeInfoSettingsNetwork {
    host?: Host;
}
export interface NodesInfoNodeInfoSettingsNode {
    name: Name;
    attr: Record<string, any>;
    max_local_storage_nodes?: string;
}
export interface NodesInfoNodeInfoSettingsTransport {
    type: NodesInfoNodeInfoSettingsTransportType | string;
    'type.default'?: string;
    features?: NodesInfoNodeInfoSettingsTransportFeatures;
}
export interface NodesInfoNodeInfoSettingsTransportFeatures {
    'x-pack': string;
}
export interface NodesInfoNodeInfoSettingsTransportType {
    default: string;
}
export interface NodesInfoNodeInfoTransport {
    bound_address: string[];
    publish_address: string;
    profiles: Record<string, string>;
}
export interface NodesInfoNodeInfoXpack {
    license?: NodesInfoNodeInfoXpackLicense;
    security: NodesInfoNodeInfoXpackSecurity;
    notification?: Record<string, any>;
}
export interface NodesInfoNodeInfoXpackLicense {
    self_generated: NodesInfoNodeInfoXpackLicenseType;
}
export interface NodesInfoNodeInfoXpackLicenseType {
    type: string;
}
export interface NodesInfoNodeInfoXpackSecurity {
    http: NodesInfoNodeInfoXpackSecuritySsl;
    enabled: string;
    transport?: NodesInfoNodeInfoXpackSecuritySsl;
    authc?: NodesInfoNodeInfoXpackSecurityAuthc;
}
export interface NodesInfoNodeInfoXpackSecurityAuthc {
    realms: NodesInfoNodeInfoXpackSecurityAuthcRealms;
    token: NodesInfoNodeInfoXpackSecurityAuthcToken;
}
export interface NodesInfoNodeInfoXpackSecurityAuthcRealms {
    file?: Record<string, NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus>;
    native?: Record<string, NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus>;
    pki?: Record<string, NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus>;
}
export interface NodesInfoNodeInfoXpackSecurityAuthcRealmsStatus {
    enabled?: string;
    order: string;
}
export interface NodesInfoNodeInfoXpackSecurityAuthcToken {
    enabled: string;
}
export interface NodesInfoNodeInfoXpackSecuritySsl {
    ssl: Record<string, string>;
}
export interface NodesInfoNodeJvmInfo {
    gc_collectors: string[];
    mem: NodesInfoNodeInfoJvmMemory;
    memory_pools: string[];
    pid: integer;
    start_time_in_millis: EpochTime<UnitMillis>;
    version: VersionString;
    vm_name: Name;
    vm_vendor: string;
    vm_version: VersionString;
    using_bundled_jdk: boolean;
    bundled_jdk: boolean;
    using_compressed_ordinary_object_pointers?: boolean | string;
    input_arguments: string[];
}
export interface NodesInfoNodeOperatingSystemInfo {
    arch: string;
    available_processors: integer;
    allocated_processors?: integer;
    name: Name;
    pretty_name: Name;
    refresh_interval_in_millis: DurationValue<UnitMillis>;
    version: VersionString;
    cpu?: NodesInfoNodeInfoOSCPU;
    mem?: NodesInfoNodeInfoMemory;
    swap?: NodesInfoNodeInfoMemory;
}
export interface NodesInfoNodeProcessInfo {
    id: long;
    mlockall: boolean;
    refresh_interval_in_millis: DurationValue<UnitMillis>;
}
export interface NodesInfoNodeThreadPoolInfo {
    core?: integer;
    keep_alive?: Duration;
    max?: integer;
    queue_size: integer;
    size?: integer;
    type: string;
}
export interface NodesInfoRequest extends RequestBase {
    node_id?: NodeIds;
    metric?: Metrics;
    flat_settings?: boolean;


}
export type NodesInfoResponse = NodesInfoResponseBase;
export interface NodesInfoResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    nodes: Record<string, NodesInfoNodeInfo>;
}
export interface NodesReloadSecureSettingsRequest extends RequestBase {
    node_id?: NodeIds;

    secure_settings_password?: Password;
}
export type NodesReloadSecureSettingsResponse = NodesReloadSecureSettingsResponseBase;
export interface NodesReloadSecureSettingsResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    nodes: Record<string, NodesNodeReloadResult>;
}
export interface NodesStatsRequest extends RequestBase {
    node_id?: NodeIds;
    metric?: Metrics;
    index_metric?: Metrics;
    completion_fields?: Fields;
    fielddata_fields?: Fields;
    fields?: Fields;
    groups?: boolean;
    include_segment_file_sizes?: boolean;
    level?: Level;


    types?: string[];
    include_unloaded_segments?: boolean;
}
export type NodesStatsResponse = NodesStatsResponseBase;
export interface NodesStatsResponseBase extends NodesNodesResponseBase {
    cluster_name?: Name;
    nodes: Record<string, NodesStats>;
}
export interface NodesUsageNodeUsage {
    rest_actions: Record<string, integer>;
    since: EpochTime<UnitMillis>;
    timestamp: EpochTime<UnitMillis>;
    aggregations: Record<string, any>;
}
export interface NodesUsageRequest extends RequestBase {
    node_id?: NodeIds;
    metric?: Metrics;

}
export type NodesUsageResponse = NodesUsageResponseBase;
export interface NodesUsageResponseBase extends NodesNodesResponseBase {
    cluster_name: Name;
    nodes: Record<string, NodesUsageNodeUsage>;
}
export interface QueryRulesQueryRule {
    rule_id: Id;
    type: QueryRulesQueryRuleType;
    criteria: QueryRulesQueryRuleCriteria | QueryRulesQueryRuleCriteria[];
    actions: QueryRulesQueryRuleActions;
    priority?: integer;
}
export interface QueryRulesQueryRuleActions {
    ids?: Id[];
    docs?: QueryDslPinnedDoc[];
}
export interface QueryRulesQueryRuleCriteria {
    type: QueryRulesQueryRuleCriteriaType;
    metadata?: string;
    values?: any[];
}
export type QueryRulesQueryRuleCriteriaType = 'global' | 'exact' | 'exact_fuzzy' | 'fuzzy' | 'prefix' | 'suffix' | 'contains' | 'lt' | 'lte' | 'gt' | 'gte' | 'always';
export type QueryRulesQueryRuleType = 'pinned';
export interface QueryRulesQueryRuleset {
    ruleset_id: Id;
    rules: QueryRulesQueryRule[];
}
export interface QueryRulesDeleteRuleRequest extends RequestBase {
    ruleset_id: Id;
    rule_id: Id;
}
export type QueryRulesDeleteRuleResponse = AcknowledgedResponseBase;
export interface QueryRulesDeleteRulesetRequest extends RequestBase {
    ruleset_id: Id;
}
export type QueryRulesDeleteRulesetResponse = AcknowledgedResponseBase;
export interface QueryRulesGetRuleRequest extends RequestBase {
    ruleset_id: Id;
    rule_id: Id;
}
export type QueryRulesGetRuleResponse = QueryRulesQueryRule;
export interface QueryRulesGetRulesetRequest extends RequestBase {
    ruleset_id: Id;
}
export type QueryRulesGetRulesetResponse = QueryRulesQueryRuleset;
export interface QueryRulesListRulesetsQueryRulesetListItem {
    ruleset_id: Id;
    rule_total_count: integer;
    rule_criteria_types_counts: Record<string, integer>;
}
export interface QueryRulesListRulesetsRequest extends RequestBase {
    from?: integer;
    size?: integer;
}
export interface QueryRulesListRulesetsResponse {
    count: long;
    results: QueryRulesListRulesetsQueryRulesetListItem[];
}
export interface QueryRulesPutRuleRequest extends RequestBase {
    ruleset_id: Id;
    rule_id: Id;
    type: QueryRulesQueryRuleType;
    criteria: QueryRulesQueryRuleCriteria | QueryRulesQueryRuleCriteria[];
    actions: QueryRulesQueryRuleActions;
    priority?: integer;
}
export interface QueryRulesPutRuleResponse {
    result: Result;
}
export interface QueryRulesPutRulesetRequest extends RequestBase {
    ruleset_id: Id;
    rules: QueryRulesQueryRule | QueryRulesQueryRule[];
}
export interface QueryRulesPutRulesetResponse {
    result: Result;
}
export interface RollupDateHistogramGrouping {
    delay?: Duration;
    field: Field;
    format?: string;
    interval?: Duration;
    calendar_interval?: Duration;
    fixed_interval?: Duration;
    time_zone?: TimeZone;
}
export interface RollupFieldMetric {
    field: Field;
    metrics: RollupMetric[];
}
export interface RollupGroupings {
    date_histogram?: RollupDateHistogramGrouping;
    histogram?: RollupHistogramGrouping;
    terms?: RollupTermsGrouping;
}
export interface RollupHistogramGrouping {
    fields: Fields;
    interval: long;
}
export type RollupMetric = 'min' | 'max' | 'sum' | 'avg' | 'value_count';
export interface RollupTermsGrouping {
    fields: Fields;
}
export interface RollupDeleteJobRequest extends RequestBase {
    id: Id;
}
export interface RollupDeleteJobResponse {
    acknowledged: boolean;
    task_failures?: TaskFailure[];
}
export type RollupGetJobsIndexingJobState = 'started' | 'indexing' | 'stopping' | 'stopped' | 'aborting';
export interface RollupGetJobsRequest extends RequestBase {
    id?: Id;
}
export interface RollupGetJobsResponse {
    jobs: RollupGetJobsRollupJob[];
}
export interface RollupGetJobsRollupJob {
    config: RollupGetJobsRollupJobConfiguration;
    stats: RollupGetJobsRollupJobStats;
    status: RollupGetJobsRollupJobStatus;
}
export interface RollupGetJobsRollupJobConfiguration {
    cron: string;
    groups: RollupGroupings;
    id: Id;
    index_pattern: string;
    metrics: RollupFieldMetric[];
    page_size: long;
    rollup_index: IndexName;

}
export interface RollupGetJobsRollupJobStats {
    documents_processed: long;
    index_failures: long;
    index_time_in_ms: DurationValue<UnitMillis>;
    index_total: long;
    pages_processed: long;
    rollups_indexed: long;
    search_failures: long;
    search_time_in_ms: DurationValue<UnitMillis>;
    search_total: long;
    trigger_count: long;
    processing_time_in_ms: DurationValue<UnitMillis>;
    processing_total: long;
}
export interface RollupGetJobsRollupJobStatus {
    current_position?: Record<string, any>;
    job_state: RollupGetJobsIndexingJobState;
    upgraded_doc_id?: boolean;
}
export interface RollupGetRollupCapsRequest extends RequestBase {
    id?: Id;
}
export type RollupGetRollupCapsResponse = Record<IndexName, RollupGetRollupCapsRollupCapabilities>;
export interface RollupGetRollupCapsRollupCapabilities {
    rollup_jobs: RollupGetRollupCapsRollupCapabilitySummary[];
}
export interface RollupGetRollupCapsRollupCapabilitySummary {
    fields: Record<Field, RollupGetRollupCapsRollupFieldSummary[]>;
    index_pattern: string;
    job_id: string;
    rollup_index: string;
}
export interface RollupGetRollupCapsRollupFieldSummary {
    agg: string;
    calendar_interval?: Duration;
    time_zone?: TimeZone;
}
export interface RollupGetRollupIndexCapsIndexCapabilities {
    rollup_jobs: RollupGetRollupIndexCapsRollupJobSummary[];
}
export interface RollupGetRollupIndexCapsRequest extends RequestBase {
    index: Ids;
}
export type RollupGetRollupIndexCapsResponse = Record<IndexName, RollupGetRollupIndexCapsIndexCapabilities>;
export interface RollupGetRollupIndexCapsRollupJobSummary {
    fields: Record<Field, RollupGetRollupIndexCapsRollupJobSummaryField[]>;
    index_pattern: string;
    job_id: Id;
    rollup_index: IndexName;
}
export interface RollupGetRollupIndexCapsRollupJobSummaryField {
    agg: string;
    time_zone?: TimeZone;
    calendar_interval?: Duration;
}
export interface RollupPutJobRequest extends RequestBase {
    id: Id;
    cron: string;
    groups: RollupGroupings;
    index_pattern: string;
    metrics?: RollupFieldMetric[];
    page_size: integer;
    rollup_index: IndexName;

    headers?: HttpHeaders;
}
export type RollupPutJobResponse = AcknowledgedResponseBase;
export interface RollupRollupSearchRequest extends RequestBase {
    index: Indices;
    rest_total_hits_as_int?: boolean;
    typed_keys?: boolean;
    aggregations?: Record<string, AggregationsAggregationContainer>;
    /** @alias aggregations */
    aggs?: Record<string, AggregationsAggregationContainer>;
    query?: QueryDslQueryContainer;
    size?: integer;
}
export interface RollupRollupSearchResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> {
    took: long;
    timed_out: boolean;
    terminated_early?: boolean;
    _shards: ShardStatistics;
    hits: SearchHitsMetadata<TDocument>;
    aggregations?: TAggregations;
}
export interface RollupStartJobRequest extends RequestBase {
    id: Id;
}
export interface RollupStartJobResponse {
    started: boolean;
}
export interface RollupStopJobRequest extends RequestBase {
    id: Id;

    wait_for_completion?: boolean;
}
export interface RollupStopJobResponse {
    stopped: boolean;
}
export interface SearchApplicationAnalyticsCollection {
    event_data_stream: SearchApplicationEventDataStream;
}
export interface SearchApplicationEventDataStream {
    name: IndexName;
}
export interface SearchApplicationSearchApplication {
    name: Name;
    indices: IndexName[];
    updated_at_millis: EpochTime<UnitMillis>;
    analytics_collection_name?: Name;
    template?: SearchApplicationSearchApplicationTemplate;
}
export interface SearchApplicationSearchApplicationTemplate {
    script: Script | string;
}
export interface SearchApplicationDeleteRequest extends RequestBase {
    name: Name;
}
export type SearchApplicationDeleteResponse = AcknowledgedResponseBase;
export interface SearchApplicationDeleteBehavioralAnalyticsRequest extends RequestBase {
    name: Name;
}
export type SearchApplicationDeleteBehavioralAnalyticsResponse = AcknowledgedResponseBase;
export interface SearchApplicationGetRequest extends RequestBase {
    name: Name;
}
export type SearchApplicationGetResponse = SearchApplicationSearchApplication;
export interface SearchApplicationGetBehavioralAnalyticsRequest extends RequestBase {
    name?: Name[];
}
export type SearchApplicationGetBehavioralAnalyticsResponse = Record<Name, SearchApplicationAnalyticsCollection>;
export interface SearchApplicationListRequest extends RequestBase {
    q?: string;
    from?: integer;
    size?: integer;
}
export interface SearchApplicationListResponse {
    count: long;
    results: SearchApplicationListSearchApplicationListItem[];
}
export interface SearchApplicationListSearchApplicationListItem {
    name: Name;
    indices: IndexName[];
    updated_at_millis: EpochTime<UnitMillis>;
    analytics_collection_name?: Name;
}
export interface SearchApplicationPutRequest extends RequestBase {
    name: Name;
    create?: boolean;
    search_application?: SearchApplicationSearchApplication;
}
export interface SearchApplicationPutResponse {
    result: Result;
}
export interface SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase extends AcknowledgedResponseBase {
    name: Name;
}
export interface SearchApplicationPutBehavioralAnalyticsRequest extends RequestBase {
    name: Name;
}
export type SearchApplicationPutBehavioralAnalyticsResponse = SearchApplicationPutBehavioralAnalyticsAnalyticsAcknowledgeResponseBase;
export interface SearchApplicationSearchRequest extends RequestBase {
    name: Name;
    typed_keys?: boolean;
    params?: Record<string, any>;
}
export type SearchApplicationSearchResponse<TDocument = unknown, TAggregations = Record<AggregateName, AggregationsAggregate>> = SearchResponseBody<TDocument, TAggregations>;
export type SearchableSnapshotsStatsLevel = 'cluster' | 'indices' | 'shards';
export interface SearchableSnapshotsCacheStatsNode {
    shared_cache: SearchableSnapshotsCacheStatsShared;
}
export interface SearchableSnapshotsCacheStatsRequest extends RequestBase {
    node_id?: NodeIds;

}
export interface SearchableSnapshotsCacheStatsResponse {
    nodes: Record<string, SearchableSnapshotsCacheStatsNode>;
}
export interface SearchableSnapshotsCacheStatsShared {
    reads: long;
    bytes_read_in_bytes: ByteSize;
    writes: long;
    bytes_written_in_bytes: ByteSize;
    evictions: long;
    num_regions: integer;
    size_in_bytes: ByteSize;
    region_size_in_bytes: ByteSize;
}
export interface SearchableSnapshotsClearCacheRequest extends RequestBase {
    index?: Indices;
    expand_wildcards?: ExpandWildcards;
    allow_no_indices?: boolean;
    ignore_unavailable?: boolean;
    pretty?: boolean;
    human?: boolean;
}
export type SearchableSnapshotsClearCacheResponse = any;
export interface SearchableSnapshotsMountMountedSnapshot {
    snapshot: Name;
    indices: Indices;
    shards: ShardStatistics;
}
export interface SearchableSnapshotsMountRequest extends RequestBase {
    repository: Name;
    snapshot: Name;

    wait_for_completion?: boolean;
    storage?: string;
    index: IndexName;
    renamed_index?: IndexName;
    index_settings?: Record<string, any>;
    ignore_index_settings?: string[];
}
export interface SearchableSnapshotsMountResponse {
    snapshot: SearchableSnapshotsMountMountedSnapshot;
}
export interface SearchableSnapshotsStatsRequest extends RequestBase {
    index?: Indices;
    level?: SearchableSnapshotsStatsLevel;
}
export interface SearchableSnapshotsStatsResponse {
    stats: any;
    total: any;
}
export interface SecurityApiKey {
    creation?: long;
    expiration?: long;
    id: Id;
    invalidated?: boolean;
    name: Name;
    realm?: string;
    realm_type?: string;
    username?: Username;
    profile_uid?: string;
    metadata?: Metadata;
    role_descriptors?: Record<string, SecurityRoleDescriptor>;
    limited_by?: Record<string, SecurityRoleDescriptor>[];
    _sort?: SortResults;
}
export interface SecurityApplicationGlobalUserPrivileges {
    manage: SecurityManageUserPrivileges;
}
export interface SecurityApplicationPrivileges {
    application: string;
    privileges: string[];
    resources: string[];
}
export interface SecurityBulkError {
    count: integer;
    details: Record<string, ErrorCause>;
}
export interface SecurityClusterNode {
    name: Name;
}
export type SecurityClusterPrivilege = 'all' | 'cancel_task' | 'create_snapshot' | 'cross_cluster_replication' | 'cross_cluster_search' | 'delegate_pki' | 'grant_api_key' | 'manage' | 'manage_api_key' | 'manage_autoscaling' | 'manage_behavioral_analytics' | 'manage_ccr' | 'manage_data_frame_transforms' | 'manage_data_stream_global_retention' | 'manage_enrich' | 'manage_ilm' | 'manage_index_templates' | 'manage_inference' | 'manage_ingest_pipelines' | 'manage_logstash_pipelines' | 'manage_ml' | 'manage_oidc' | 'manage_own_api_key' | 'manage_pipeline' | 'manage_rollup' | 'manage_saml' | 'manage_search_application' | 'manage_search_query_rules' | 'manage_search_synonyms' | 'manage_security' | 'manage_service_account' | 'manage_slm' | 'manage_token' | 'manage_transform' | 'manage_user_profile' | 'manage_watcher' | 'monitor' | 'monitor_data_frame_transforms' | 'monitor_data_stream_global_retention' | 'monitor_enrich' | 'monitor_inference' | 'monitor_ml' | 'monitor_rollup' | 'monitor_snapshot' | 'monitor_text_structure' | 'monitor_transform' | 'monitor_watcher' | 'none' | 'post_behavioral_analytics_event' | 'read_ccr' | 'read_connector_secrets' | 'read_fleet_secrets' | 'read_ilm' | 'read_pipeline' | 'read_security' | 'read_slm' | 'transport_client' | 'write_connector_secrets' | 'write_fleet_secrets' | string;
export interface SecurityCreatedStatus {
    created: boolean;
}
export interface SecurityFieldRule {
    username?: Names;
    dn?: Names;
    groups?: Names;
}
export interface SecurityFieldSecurity {
    except?: Fields;
    grant?: Fields;
}
export interface SecurityGlobalPrivilege {
    application: SecurityApplicationGlobalUserPrivileges;
}
export type SecurityGrantType = 'password' | 'access_token';
export type SecurityIndexPrivilege = 'all' | 'auto_configure' | 'create' | 'create_doc' | 'create_index' | 'cross_cluster_replication' | 'cross_cluster_replication_internal' | 'delete' | 'delete_index' | 'index' | 'maintenance' | 'manage' | 'manage_data_stream_lifecycle' | 'manage_follow_index' | 'manage_ilm' | 'manage_leader_index' | 'monitor' | 'none' | 'read' | 'read_cross_cluster' | 'view_index_metadata' | 'write' | string;
export interface SecurityIndicesPrivileges {
    field_security?: SecurityFieldSecurity;
    names: Indices;
    privileges: SecurityIndexPrivilege[];
    query?: SecurityIndicesPrivilegesQuery;
    allow_restricted_indices?: boolean;
}
export type SecurityIndicesPrivilegesQuery = string | QueryDslQueryContainer | SecurityRoleTemplateQuery;
export interface SecurityManageUserPrivileges {
    applications: string[];
}
export interface SecurityRealmInfo {
    name: Name;
    type: string;
}
export interface SecurityRoleDescriptor {
    cluster?: SecurityClusterPrivilege[];
    indices?: SecurityIndicesPrivileges[];
    index?: SecurityIndicesPrivileges[];
    global?: SecurityGlobalPrivilege[] | SecurityGlobalPrivilege;
    applications?: SecurityApplicationPrivileges[];
    metadata?: Metadata;
    run_as?: string[];
    description?: string;
    transient_metadata?: Record<string, any>;
}
export interface SecurityRoleDescriptorRead {
    cluster: SecurityClusterPrivilege[];
    indices: SecurityIndicesPrivileges[];
    index: SecurityIndicesPrivileges[];
    global?: SecurityGlobalPrivilege[] | SecurityGlobalPrivilege;
    applications?: SecurityApplicationPrivileges[];
    metadata?: Metadata;
    run_as?: string[];
    description?: string;
    transient_metadata?: Record<string, any>;
}
export interface SecurityRoleMapping {
    enabled: boolean;
    metadata: Metadata;
    roles?: string[];
    role_templates?: SecurityRoleTemplate[];
    rules: SecurityRoleMappingRule;
}
export interface SecurityRoleMappingRule {
    any?: SecurityRoleMappingRule[];
    all?: SecurityRoleMappingRule[];
    field?: SecurityFieldRule;
    except?: SecurityRoleMappingRule;
}
export interface SecurityRoleTemplate {
    format?: SecurityTemplateFormat;
    template: Script | string;
}
export type SecurityRoleTemplateInlineQuery = string | QueryDslQueryContainer;
export interface SecurityRoleTemplateQuery {
    template?: SecurityRoleTemplateScript | SecurityRoleTemplateInlineQuery;
}
export interface SecurityRoleTemplateScript {
    source?: SecurityRoleTemplateInlineQuery;
    id?: Id;
    params?: Record<string, any>;
    lang?: ScriptLanguage;
    options?: Record<string, string>;
}
export type SecurityTemplateFormat = 'string' | 'json';
export interface SecurityUser {
    email?: string | null;
    full_name?: Name | null;
    metadata: Metadata;
    roles: string[];
    username: Username;
    enabled: boolean;
    profile_uid?: SecurityUserProfileId;
}
export interface SecurityUserIndicesPrivileges {
    field_security?: SecurityFieldSecurity[];
    names: Indices;
    privileges: SecurityIndexPrivilege[];
    query?: SecurityIndicesPrivilegesQuery[];
    allow_restricted_indices: boolean;
}
export interface SecurityUserProfile {
    uid: SecurityUserProfileId;
    user: SecurityUserProfileUser;
    data: Record<string, any>;
    labels: Record<string, any>;
    enabled?: boolean;
}
export interface SecurityUserProfileHitMetadata {
    _primary_term: long;
    _seq_no: SequenceNumber;
}
export type SecurityUserProfileId = string;
export interface SecurityUserProfileUser {
    email?: string | null;
    full_name?: Name | null;
    realm_name: Name;
    realm_domain?: Name;
    roles: string[];
    username: Username;
}
export interface SecurityUserProfileWithMetadata extends SecurityUserProfile {
    last_synchronized: long;
    _doc: SecurityUserProfileHitMetadata;
}
export interface SecurityActivateUserProfileRequest extends RequestBase {
    access_token?: string;
    grant_type: SecurityGrantType;
    password?: string;
    username?: string;
}
export type SecurityActivateUserProfileResponse = SecurityUserProfileWithMetadata;
export interface SecurityAuthenticateRequest extends RequestBase {
}
export interface SecurityAuthenticateResponse {
    api_key?: SecurityApiKey;
    authentication_realm: SecurityRealmInfo;
    email?: string | null;
    full_name?: Name | null;
    lookup_realm: SecurityRealmInfo;
    metadata: Metadata;
    roles: string[];
    username: Username;
    enabled: boolean;
    authentication_type: string;
    token?: SecurityAuthenticateToken;
}
export interface SecurityAuthenticateToken {
    name: Name;
    type?: string;
}
export interface SecurityBulkDeleteRoleRequest extends RequestBase {
    refresh?: Refresh;
    names: string[];
}
export interface SecurityBulkDeleteRoleResponse {
    deleted?: string[];
    not_found?: string[];
    errors?: SecurityBulkError;
}
export interface SecurityBulkPutRoleRequest extends RequestBase {
    refresh?: Refresh;
    roles: Record<string, SecurityRoleDescriptor>;
}
export interface SecurityBulkPutRoleResponse {
    created?: string[];
    updated?: string[];
    noop?: string[];
    errors?: SecurityBulkError;
}
export interface SecurityChangePasswordRequest extends RequestBase {
    username?: Username;
    refresh?: Refresh;
    password?: Password;
    password_hash?: string;
}
export interface SecurityChangePasswordResponse {
}
export interface SecurityClearApiKeyCacheRequest extends RequestBase {
    ids: Ids;
}
export interface SecurityClearApiKeyCacheResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<string, SecurityClusterNode>;
}
export interface SecurityClearCachedPrivilegesRequest extends RequestBase {
    application: Name;
}
export interface SecurityClearCachedPrivilegesResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<string, SecurityClusterNode>;
}
export interface SecurityClearCachedRealmsRequest extends RequestBase {
    realms: Names;
    usernames?: string[];
}
export interface SecurityClearCachedRealmsResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<string, SecurityClusterNode>;
}
export interface SecurityClearCachedRolesRequest extends RequestBase {
    name: Names;
}
export interface SecurityClearCachedRolesResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<string, SecurityClusterNode>;
}
export interface SecurityClearCachedServiceTokensRequest extends RequestBase {
    namespace: Namespace;
    service: Service;
    name: Names;
}
export interface SecurityClearCachedServiceTokensResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    nodes: Record<string, SecurityClusterNode>;
}
export interface SecurityCreateApiKeyRequest extends RequestBase {
    refresh?: Refresh;
    expiration?: Duration;
    name?: Name;
    role_descriptors?: Record<string, SecurityRoleDescriptor>;
    metadata?: Metadata;
}
export interface SecurityCreateApiKeyResponse {
    api_key: string;
    expiration?: long;
    id: Id;
    name: Name;
    encoded: string;
}
export interface SecurityCreateServiceTokenRequest extends RequestBase {
    namespace: Namespace;
    service: Service;
    name?: Name;
    refresh?: Refresh;
}
export interface SecurityCreateServiceTokenResponse {
    created: boolean;
    token: SecurityCreateServiceTokenToken;
}
export interface SecurityCreateServiceTokenToken {
    name: Name;
    value: string;
}
export interface SecurityDeletePrivilegesFoundStatus {
    found: boolean;
}
export interface SecurityDeletePrivilegesRequest extends RequestBase {
    application: Name;
    name: Names;
    refresh?: Refresh;
}
export type SecurityDeletePrivilegesResponse = Record<string, Record<string, SecurityDeletePrivilegesFoundStatus>>;
export interface SecurityDeleteRoleRequest extends RequestBase {
    name: Name;
    refresh?: Refresh;
}
export interface SecurityDeleteRoleResponse {
    found: boolean;
}
export interface SecurityDeleteRoleMappingRequest extends RequestBase {
    name: Name;
    refresh?: Refresh;
}
export interface SecurityDeleteRoleMappingResponse {
    found: boolean;
}
export interface SecurityDeleteServiceTokenRequest extends RequestBase {
    namespace: Namespace;
    service: Service;
    name: Name;
    refresh?: Refresh;
}
export interface SecurityDeleteServiceTokenResponse {
    found: boolean;
}
export interface SecurityDeleteUserRequest extends RequestBase {
    username: Username;
    refresh?: Refresh;
}
export interface SecurityDeleteUserResponse {
    found: boolean;
}
export interface SecurityDisableUserRequest extends RequestBase {
    username: Username;
    refresh?: Refresh;
}
export interface SecurityDisableUserResponse {
}
export interface SecurityDisableUserProfileRequest extends RequestBase {
    uid: SecurityUserProfileId;
    refresh?: Refresh;
}
export type SecurityDisableUserProfileResponse = AcknowledgedResponseBase;
export interface SecurityEnableUserRequest extends RequestBase {
    username: Username;
    refresh?: Refresh;
}
export interface SecurityEnableUserResponse {
}
export interface SecurityEnableUserProfileRequest extends RequestBase {
    uid: SecurityUserProfileId;
    refresh?: Refresh;
}
export type SecurityEnableUserProfileResponse = AcknowledgedResponseBase;
export interface SecurityEnrollKibanaRequest extends RequestBase {
}
export interface SecurityEnrollKibanaResponse {
    token: SecurityEnrollKibanaToken;
    http_ca: string;
}
export interface SecurityEnrollKibanaToken {
    name: string;
    value: string;
}
export interface SecurityEnrollNodeRequest extends RequestBase {
}
export interface SecurityEnrollNodeResponse {
    http_ca_key: string;
    http_ca_cert: string;
    transport_ca_cert: string;
    transport_key: string;
    transport_cert: string;
    nodes_addresses: string[];
}
export interface SecurityGetApiKeyRequest extends RequestBase {
    id?: Id;
    name?: Name;
    owner?: boolean;
    realm_name?: Name;
    username?: Username;
    with_limited_by?: boolean;
    active_only?: boolean;
    with_profile_uid?: boolean;
}
export interface SecurityGetApiKeyResponse {
    api_keys: SecurityApiKey[];
}
export interface SecurityGetBuiltinPrivilegesRequest extends RequestBase {
}
export interface SecurityGetBuiltinPrivilegesResponse {
    cluster: string[];
    index: Indices;
}
export interface SecurityGetPrivilegesRequest extends RequestBase {
    application?: Name;
    name?: Names;
}
export type SecurityGetPrivilegesResponse = Record<string, Record<string, SecurityPutPrivilegesActions>>;
export interface SecurityGetRoleRequest extends RequestBase {
    name?: Names;
}
export type SecurityGetRoleResponse = Record<string, SecurityGetRoleRole>;
export interface SecurityGetRoleRole {
    cluster: string[];
    indices: SecurityIndicesPrivileges[];
    metadata: Metadata;
    run_as: string[];
    transient_metadata?: Record<string, any>;
    applications: SecurityApplicationPrivileges[];
    role_templates?: SecurityRoleTemplate[];
    global?: Record<string, Record<string, Record<string, string[]>>>;
}
export interface SecurityGetRoleMappingRequest extends RequestBase {
    name?: Names;
}
export type SecurityGetRoleMappingResponse = Record<string, SecurityRoleMapping>;
export interface SecurityGetServiceAccountsRequest extends RequestBase {
    namespace?: Namespace;
    service?: Service;
}
export type SecurityGetServiceAccountsResponse = Record<string, SecurityGetServiceAccountsRoleDescriptorWrapper>;
export interface SecurityGetServiceAccountsRoleDescriptorWrapper {
    role_descriptor: SecurityRoleDescriptorRead;
}
export interface SecurityGetServiceCredentialsNodesCredentials {
    _nodes: NodeStatistics;
    file_tokens: Record<string, SecurityGetServiceCredentialsNodesCredentialsFileToken>;
}
export interface SecurityGetServiceCredentialsNodesCredentialsFileToken {
    nodes: string[];
}
export interface SecurityGetServiceCredentialsRequest extends RequestBase {
    namespace: Namespace;
    service: Name;
}
export interface SecurityGetServiceCredentialsResponse {
    service_account: string;
    count: integer;
    tokens: Record<string, Metadata>;
    nodes_credentials: SecurityGetServiceCredentialsNodesCredentials;
}
export type SecurityGetTokenAccessTokenGrantType = 'password' | 'client_credentials' | '_kerberos' | 'refresh_token';
export interface SecurityGetTokenAuthenticatedUser extends SecurityUser {
    authentication_realm: SecurityGetTokenUserRealm;
    lookup_realm: SecurityGetTokenUserRealm;
    authentication_provider?: SecurityGetTokenAuthenticationProvider;
    authentication_type: string;
}
export interface SecurityGetTokenAuthenticationProvider {
    type: string;
    name: Name;
}
export interface SecurityGetTokenRequest extends RequestBase {
    grant_type?: SecurityGetTokenAccessTokenGrantType;
    scope?: string;
    password?: Password;
    kerberos_ticket?: string;
    refresh_token?: string;
    username?: Username;
}
export interface SecurityGetTokenResponse {
    access_token: string;
    expires_in: long;
    scope?: string;
    type: string;
    refresh_token?: string;
    kerberos_authentication_response_token?: string;
    authentication: SecurityGetTokenAuthenticatedUser;
}
export interface SecurityGetTokenUserRealm {
    name: Name;
    type: string;
}
export interface SecurityGetUserRequest extends RequestBase {
    username?: Username | Username[];
    with_profile_uid?: boolean;
}
export type SecurityGetUserResponse = Record<string, SecurityUser>;
export interface SecurityGetUserPrivilegesRequest extends RequestBase {
    application?: Name;
    priviledge?: Name;
    username?: Name | null;
}
export interface SecurityGetUserPrivilegesResponse {
    applications: SecurityApplicationPrivileges[];
    cluster: string[];
    global: SecurityGlobalPrivilege[];
    indices: SecurityUserIndicesPrivileges[];
    run_as: string[];
}
export interface SecurityGetUserProfileGetUserProfileErrors {
    count: long;
    details: Record<SecurityUserProfileId, ErrorCause>;
}
export interface SecurityGetUserProfileRequest extends RequestBase {
    uid: SecurityUserProfileId | SecurityUserProfileId[];
    data?: string | string[];
}
export interface SecurityGetUserProfileResponse {
    profiles: SecurityUserProfileWithMetadata[];
    errors?: SecurityGetUserProfileGetUserProfileErrors;
}
export type SecurityGrantApiKeyApiKeyGrantType = 'access_token' | 'password';
export interface SecurityGrantApiKeyGrantApiKey {
    name: Name;
    expiration?: DurationLarge;
    role_descriptors?: Record<string, SecurityRoleDescriptor> | Record<string, SecurityRoleDescriptor>[];
    metadata?: Metadata;
}
export interface SecurityGrantApiKeyRequest extends RequestBase {
    api_key: SecurityGrantApiKeyGrantApiKey;
    grant_type: SecurityGrantApiKeyApiKeyGrantType;
    access_token?: string;
    username?: Username;
    password?: Password;
    run_as?: Username;
}
export interface SecurityGrantApiKeyResponse {
    api_key: string;
    id: Id;
    name: Name;
    expiration?: EpochTime<UnitMillis>;
    encoded: string;
}
export interface SecurityHasPrivilegesApplicationPrivilegesCheck {
    application: string;
    privileges: string[];
    resources: string[];
}
export type SecurityHasPrivilegesApplicationsPrivileges = Record<Name, SecurityHasPrivilegesResourcePrivileges>;
export interface SecurityHasPrivilegesIndexPrivilegesCheck {
    names: Indices;
    privileges: SecurityIndexPrivilege[];
    allow_restricted_indices?: boolean;
}
export type SecurityHasPrivilegesPrivileges = Record<string, boolean>;
export interface SecurityHasPrivilegesRequest extends RequestBase {
    user?: Name;
    application?: SecurityHasPrivilegesApplicationPrivilegesCheck[];
    cluster?: SecurityClusterPrivilege[];
    index?: SecurityHasPrivilegesIndexPrivilegesCheck[];
}
export type SecurityHasPrivilegesResourcePrivileges = Record<Name, SecurityHasPrivilegesPrivileges>;
export interface SecurityHasPrivilegesResponse {
    application: SecurityHasPrivilegesApplicationsPrivileges;
    cluster: Record<string, boolean>;
    has_all_requested: boolean;
    index: Record<IndexName, SecurityHasPrivilegesPrivileges>;
    username: Username;
}
export interface SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors {
    count: long;
    details: Record<SecurityUserProfileId, ErrorCause>;
}
export interface SecurityHasPrivilegesUserProfilePrivilegesCheck {
    application?: SecurityHasPrivilegesApplicationPrivilegesCheck[];
    cluster?: SecurityClusterPrivilege[];
    index?: SecurityHasPrivilegesIndexPrivilegesCheck[];
}
export interface SecurityHasPrivilegesUserProfileRequest extends RequestBase {
    uids: SecurityUserProfileId[];
    privileges: SecurityHasPrivilegesUserProfilePrivilegesCheck;
}
export interface SecurityHasPrivilegesUserProfileResponse {
    has_privilege_uids: SecurityUserProfileId[];
    errors?: SecurityHasPrivilegesUserProfileHasPrivilegesUserProfileErrors;
}
export interface SecurityInvalidateApiKeyRequest extends RequestBase {
    id?: Id;
    ids?: Id[];
    name?: Name;
    owner?: boolean;
    realm_name?: string;
    username?: Username;
}
export interface SecurityInvalidateApiKeyResponse {
    error_count: integer;
    error_details?: ErrorCause[];
    invalidated_api_keys: string[];
    previously_invalidated_api_keys: string[];
}
export interface SecurityInvalidateTokenRequest extends RequestBase {
    token?: string;
    refresh_token?: string;
    realm_name?: Name;
    username?: Username;
}
export interface SecurityInvalidateTokenResponse {
    error_count: long;
    error_details?: ErrorCause[];
    invalidated_tokens: long;
    previously_invalidated_tokens: long;
}
export interface SecurityPutPrivilegesActions {
    actions: string[];
    application?: string;
    name?: Name;
    metadata?: Metadata;
}
export interface SecurityPutPrivilegesRequest extends RequestBase {
    refresh?: Refresh;
    privileges?: Record<string, Record<string, SecurityPutPrivilegesActions>>;
}
export type SecurityPutPrivilegesResponse = Record<string, Record<string, SecurityCreatedStatus>>;
export interface SecurityPutRoleRequest extends RequestBase {
    name: Name;
    refresh?: Refresh;
    applications?: SecurityApplicationPrivileges[];
    cluster?: SecurityClusterPrivilege[];
    global?: Record<string, any>;
    indices?: SecurityIndicesPrivileges[];
    metadata?: Metadata;
    run_as?: string[];
    description?: string;
    transient_metadata?: Record<string, any>;
}
export interface SecurityPutRoleResponse {
    role: SecurityCreatedStatus;
}
export interface SecurityPutRoleMappingRequest extends RequestBase {
    name: Name;
    refresh?: Refresh;
    enabled?: boolean;
    metadata?: Metadata;
    roles?: string[];
    role_templates?: SecurityRoleTemplate[];
    rules?: SecurityRoleMappingRule;
    run_as?: string[];
}
export interface SecurityPutRoleMappingResponse {
    created?: boolean;
    role_mapping: SecurityCreatedStatus;
}
export interface SecurityPutUserRequest extends RequestBase {
    username: Username;
    refresh?: Refresh;
    email?: string | null;
    full_name?: string | null;
    metadata?: Metadata;
    password?: Password;
    password_hash?: string;
    roles?: string[];
    enabled?: boolean;
}
export interface SecurityPutUserResponse {
    created: boolean;
}
export type SecurityQueryApiKeysApiKeyAggregate = AggregationsCardinalityAggregate | AggregationsValueCountAggregate | AggregationsStringTermsAggregate | AggregationsLongTermsAggregate | AggregationsDoubleTermsAggregate | AggregationsUnmappedTermsAggregate | AggregationsMultiTermsAggregate | AggregationsMissingAggregate | AggregationsFilterAggregate | AggregationsFiltersAggregate | AggregationsRangeAggregate | AggregationsDateRangeAggregate | AggregationsCompositeAggregate;
export interface SecurityQueryApiKeysApiKeyAggregationContainer {
    aggregations?: Record<string, SecurityQueryApiKeysApiKeyAggregationContainer>;
    aggs?: Record<string, SecurityQueryApiKeysApiKeyAggregationContainer>;
    meta?: Metadata;
    cardinality?: AggregationsCardinalityAggregation;
    composite?: AggregationsCompositeAggregation;
    date_range?: AggregationsDateRangeAggregation;
    filter?: SecurityQueryApiKeysApiKeyQueryContainer;
    filters?: SecurityQueryApiKeysApiKeyFiltersAggregation;
    missing?: AggregationsMissingAggregation;
    range?: AggregationsRangeAggregation;
    terms?: AggregationsTermsAggregation;
    value_count?: AggregationsValueCountAggregation;
}
export interface SecurityQueryApiKeysApiKeyFiltersAggregation extends AggregationsBucketAggregationBase {
    filters?: AggregationsBuckets<SecurityQueryApiKeysApiKeyQueryContainer>;
    other_bucket?: boolean;
    other_bucket_key?: string;
    keyed?: boolean;
}
export interface SecurityQueryApiKeysApiKeyQueryContainer {
    bool?: QueryDslBoolQuery;
    exists?: QueryDslExistsQuery;
    ids?: QueryDslIdsQuery;
    match?: Partial<Record<Field, QueryDslMatchQuery | string | float | boolean>>;
    match_all?: QueryDslMatchAllQuery;
    prefix?: Partial<Record<Field, QueryDslPrefixQuery | string>>;
    range?: Partial<Record<Field, QueryDslRangeQuery>>;
    simple_query_string?: QueryDslSimpleQueryStringQuery;
    term?: Partial<Record<Field, QueryDslTermQuery | FieldValue>>;
    terms?: QueryDslTermsQuery;
    wildcard?: Partial<Record<Field, QueryDslWildcardQuery | string>>;
}
export interface SecurityQueryApiKeysRequest extends RequestBase {
    with_limited_by?: boolean;
    with_profile_uid?: boolean;
    typed_keys?: boolean;
    aggregations?: Record<string, SecurityQueryApiKeysApiKeyAggregationContainer>;
    /** @alias aggregations */
    aggs?: Record<string, SecurityQueryApiKeysApiKeyAggregationContainer>;
    query?: SecurityQueryApiKeysApiKeyQueryContainer;
    from?: integer;
    sort?: Sort;
    size?: integer;
    search_after?: SortResults;
}
export interface SecurityQueryApiKeysResponse {
    total: integer;
    count: integer;
    api_keys: SecurityApiKey[];
    aggregations?: Record<AggregateName, SecurityQueryApiKeysApiKeyAggregate>;
}
export interface SecurityQueryRoleQueryRole extends SecurityRoleDescriptor {
    _sort?: SortResults;
    name: string;
}
export interface SecurityQueryRoleRequest extends RequestBase {
    query?: SecurityQueryRoleRoleQueryContainer;
    from?: integer;
    sort?: Sort;
    size?: integer;
    search_after?: SortResults;
}
export interface SecurityQueryRoleResponse {
    total: integer;
    count: integer;
    roles: SecurityQueryRoleQueryRole[];
}
export interface SecurityQueryRoleRoleQueryContainer {
    bool?: QueryDslBoolQuery;
    exists?: QueryDslExistsQuery;
    ids?: QueryDslIdsQuery;
    match?: Partial<Record<Field, QueryDslMatchQuery | string | float | boolean>>;
    match_all?: QueryDslMatchAllQuery;
    prefix?: Partial<Record<Field, QueryDslPrefixQuery | string>>;
    range?: Partial<Record<Field, QueryDslRangeQuery>>;
    simple_query_string?: QueryDslSimpleQueryStringQuery;
    term?: Partial<Record<Field, QueryDslTermQuery | FieldValue>>;
    terms?: QueryDslTermsQuery;
    wildcard?: Partial<Record<Field, QueryDslWildcardQuery | string>>;
}
export interface SecurityQueryUserQueryUser extends SecurityUser {
    _sort?: SortResults;
}
export interface SecurityQueryUserRequest extends RequestBase {
    with_profile_uid?: boolean;
    query?: SecurityQueryUserUserQueryContainer;
    from?: integer;
    sort?: Sort;
    size?: integer;
    search_after?: SortResults;
}
export interface SecurityQueryUserResponse {
    total: integer;
    count: integer;
    users: SecurityQueryUserQueryUser[];
}
export interface SecurityQueryUserUserQueryContainer {
    ids?: QueryDslIdsQuery;
    bool?: QueryDslBoolQuery;
    exists?: QueryDslExistsQuery;
    match?: Partial<Record<Field, QueryDslMatchQuery | string | float | boolean>>;
    match_all?: QueryDslMatchAllQuery;
    prefix?: Partial<Record<Field, QueryDslPrefixQuery | string>>;
    range?: Partial<Record<Field, QueryDslRangeQuery>>;
    simple_query_string?: QueryDslSimpleQueryStringQuery;
    term?: Partial<Record<Field, QueryDslTermQuery | FieldValue>>;
    terms?: QueryDslTermsQuery;
    wildcard?: Partial<Record<Field, QueryDslWildcardQuery | string>>;
}
export interface SecuritySamlAuthenticateRequest extends RequestBase {
    content: string;
    ids: Ids;
    realm?: string;
}
export interface SecuritySamlAuthenticateResponse {
    access_token: string;
    username: string;
    expires_in: integer;
    refresh_token: string;
    realm: string;
}
export interface SecuritySamlCompleteLogoutRequest extends RequestBase {
    realm: string;
    ids: Ids;
    query_string?: string;
    content?: string;
}
export type SecuritySamlCompleteLogoutResponse = boolean;
export interface SecuritySamlInvalidateRequest extends RequestBase {
    acs?: string;
    query_string: string;
    realm?: string;
}
export interface SecuritySamlInvalidateResponse {
    invalidated: integer;
    realm: string;
    redirect: string;
}
export interface SecuritySamlLogoutRequest extends RequestBase {
    token: string;
    refresh_token?: string;
}
export interface SecuritySamlLogoutResponse {
    redirect: string;
}
export interface SecuritySamlPrepareAuthenticationRequest extends RequestBase {
    acs?: string;
    realm?: string;
    relay_state?: string;
}
export interface SecuritySamlPrepareAuthenticationResponse {
    id: Id;
    realm: string;
    redirect: string;
}
export interface SecuritySamlServiceProviderMetadataRequest extends RequestBase {
    realm_name: Name;
}
export interface SecuritySamlServiceProviderMetadataResponse {
    metadata: string;
}
export interface SecuritySuggestUserProfilesHint {
    uids?: SecurityUserProfileId[];
    labels?: Record<string, string | string[]>;
}
export interface SecuritySuggestUserProfilesRequest extends RequestBase {
    name?: string;
    size?: long;
    data?: string | string[];
    hint?: SecuritySuggestUserProfilesHint;
}
export interface SecuritySuggestUserProfilesResponse {
    total: SecuritySuggestUserProfilesTotalUserProfiles;
    took: long;
    profiles: SecurityUserProfile[];
}
export interface SecuritySuggestUserProfilesTotalUserProfiles {
    value: long;
    relation: RelationName;
}
export interface SecurityUpdateApiKeyRequest extends RequestBase {
    id: Id;
    role_descriptors?: Record<string, SecurityRoleDescriptor>;
    metadata?: Metadata;
    expiration?: Duration;
}
export interface SecurityUpdateApiKeyResponse {
    updated: boolean;
}
export interface SecurityUpdateUserProfileDataRequest extends RequestBase {
    uid: SecurityUserProfileId;
    if_seq_no?: SequenceNumber;
    if_primary_term?: long;
    refresh?: Refresh;
    labels?: Record<string, any>;
    data?: Record<string, any>;
}
export type SecurityUpdateUserProfileDataResponse = AcknowledgedResponseBase;
export type ShutdownType = 'restart' | 'remove' | 'replace';
export interface ShutdownDeleteNodeRequest extends RequestBase {
    node_id: NodeId;


}
export type ShutdownDeleteNodeResponse = AcknowledgedResponseBase;
export interface ShutdownGetNodeNodeShutdownStatus {
    node_id: NodeId;
    type: ShutdownGetNodeShutdownType;
    reason: string;
    shutdown_startedmillis: EpochTime<UnitMillis>;
    status: ShutdownGetNodeShutdownStatus;
    shard_migration: ShutdownGetNodeShardMigrationStatus;
    persistent_tasks: ShutdownGetNodePersistentTaskStatus;
    plugins: ShutdownGetNodePluginsStatus;
}
export interface ShutdownGetNodePersistentTaskStatus {
    status: ShutdownGetNodeShutdownStatus;
}
export interface ShutdownGetNodePluginsStatus {
    status: ShutdownGetNodeShutdownStatus;
}
export interface ShutdownGetNodeRequest extends RequestBase {
    node_id?: NodeIds;


}
export interface ShutdownGetNodeResponse {
    nodes: ShutdownGetNodeNodeShutdownStatus[];
}
export interface ShutdownGetNodeShardMigrationStatus {
    status: ShutdownGetNodeShutdownStatus;
}
export type ShutdownGetNodeShutdownStatus = 'not_started' | 'in_progress' | 'stalled' | 'complete';
export type ShutdownGetNodeShutdownType = 'remove' | 'restart';
export interface ShutdownPutNodeRequest extends RequestBase {
    node_id: NodeId;


    type: ShutdownType;
    reason: string;
    allocation_delay?: string;
    target_node_name?: string;
}
export type ShutdownPutNodeResponse = AcknowledgedResponseBase;
export interface SlmConfiguration {
    ignore_unavailable?: boolean;
    indices?: Indices;
    include_global_state?: boolean;
    feature_states?: string[];
    metadata?: Metadata;
    partial?: boolean;
}
export interface SlmInProgress {
    name: Name;
    start_time_millis: EpochTime<UnitMillis>;
    state: string;
    uuid: Uuid;
}
export interface SlmInvocation {
    snapshot_name: Name;
    time: DateTime;
}
export interface SlmPolicy {
    config?: SlmConfiguration;
    name: Name;
    repository: string;
    retention?: SlmRetention;
    schedule: WatcherCronExpression;
}
export interface SlmRetention {
    expire_after: Duration;
    max_count: integer;
    min_count: integer;
}
export interface SlmSnapshotLifecycle {
    in_progress?: SlmInProgress;
    last_failure?: SlmInvocation;
    last_success?: SlmInvocation;
    modified_date?: DateTime;
    modified_date_millis: EpochTime<UnitMillis>;
    next_execution?: DateTime;
    next_execution_millis: EpochTime<UnitMillis>;
    policy: SlmPolicy;
    version: VersionNumber;
    stats: SlmStatistics;
}
export interface SlmStatistics {
    retention_deletion_time?: Duration;
    retention_deletion_time_millis?: DurationValue<UnitMillis>;
    retention_failed?: long;
    retention_runs?: long;
    retention_timed_out?: long;
    policy?: Id;
    total_snapshots_deleted?: long;
    snapshots_deleted?: long;
    total_snapshot_deletion_failures?: long;
    snapshot_deletion_failures?: long;
    total_snapshots_failed?: long;
    snapshots_failed?: long;
    total_snapshots_taken?: long;
    snapshots_taken?: long;
}
export interface SlmDeleteLifecycleRequest extends RequestBase {
    policy_id: Name;
}
export type SlmDeleteLifecycleResponse = AcknowledgedResponseBase;
export interface SlmExecuteLifecycleRequest extends RequestBase {
    policy_id: Name;
}
export interface SlmExecuteLifecycleResponse {
    snapshot_name: Name;
}
export interface SlmExecuteRetentionRequest extends RequestBase {
}
export type SlmExecuteRetentionResponse = AcknowledgedResponseBase;
export interface SlmGetLifecycleRequest extends RequestBase {
    policy_id?: Names;
}
export type SlmGetLifecycleResponse = Record<Id, SlmSnapshotLifecycle>;
export interface SlmGetStatsRequest extends RequestBase {
}
export interface SlmGetStatsResponse {
    retention_deletion_time: Duration;
    retention_deletion_time_millis: DurationValue<UnitMillis>;
    retention_failed: long;
    retention_runs: long;
    retention_timed_out: long;
    total_snapshots_deleted: long;
    total_snapshot_deletion_failures: long;
    total_snapshots_failed: long;
    total_snapshots_taken: long;
    policy_stats: string[];
}
export interface SlmGetStatusRequest extends RequestBase {
}
export interface SlmGetStatusResponse {
    operation_mode: LifecycleOperationMode;
}
export interface SlmPutLifecycleRequest extends RequestBase {
    policy_id: Name;


    config?: SlmConfiguration;
    name?: Name;
    repository?: string;
    retention?: SlmRetention;
    schedule?: WatcherCronExpression;
}
export type SlmPutLifecycleResponse = AcknowledgedResponseBase;
export interface SlmStartRequest extends RequestBase {
}
export type SlmStartResponse = AcknowledgedResponseBase;
export interface SlmStopRequest extends RequestBase {
}
export type SlmStopResponse = AcknowledgedResponseBase;
export interface SnapshotAzureRepository extends SnapshotRepositoryBase {
    type: 'azure';
    settings: SnapshotAzureRepositorySettings;
}
export interface SnapshotAzureRepositorySettings extends SnapshotRepositorySettingsBase {
    client?: string;
    container?: string;
    base_path?: string;
    readonly?: boolean;
    location_mode?: string;
}
export interface SnapshotFileCountSnapshotStats {
    file_count: integer;
    size_in_bytes: long;
}
export interface SnapshotGcsRepository extends SnapshotRepositoryBase {
    type: 'gcs';
    settings: SnapshotGcsRepositorySettings;
}
export interface SnapshotGcsRepositorySettings extends SnapshotRepositorySettingsBase {
    bucket: string;
    client?: string;
    base_path?: string;
    readonly?: boolean;
    application_name?: string;
}
export interface SnapshotIndexDetails {
    shard_count: integer;
    size?: ByteSize;
    size_in_bytes: long;
    max_segments_per_shard: long;
}
export interface SnapshotInfoFeatureState {
    feature_name: string;
    indices: Indices;
}
export interface SnapshotReadOnlyUrlRepository extends SnapshotRepositoryBase {
    type: 'url';
    settings: SnapshotReadOnlyUrlRepositorySettings;
}
export interface SnapshotReadOnlyUrlRepositorySettings extends SnapshotRepositorySettingsBase {
    http_max_retries?: integer;

    max_number_of_snapshots?: integer;
    url: string;
}
export type SnapshotRepository = SnapshotAzureRepository | SnapshotGcsRepository | SnapshotS3Repository | SnapshotSharedFileSystemRepository | SnapshotReadOnlyUrlRepository | SnapshotSourceOnlyRepository;
export interface SnapshotRepositoryBase {
    uuid?: Uuid;
}
export interface SnapshotRepositorySettingsBase {
    chunk_size?: ByteSize;
    compress?: boolean;
    max_restore_bytes_per_sec?: ByteSize;
    max_snapshot_bytes_per_sec?: ByteSize;
}
export interface SnapshotS3Repository extends SnapshotRepositoryBase {
    type: 's3';
    settings: SnapshotS3RepositorySettings;
}
export interface SnapshotS3RepositorySettings extends SnapshotRepositorySettingsBase {
    bucket: string;
    client?: string;
    base_path?: string;
    readonly?: boolean;
    server_side_encryption?: boolean;
    buffer_size?: ByteSize;
    canned_acl?: string;
    storage_class?: string;
}
export interface SnapshotShardsStats {
    done: long;
    failed: long;
    finalizing: long;
    initializing: long;
    started: long;
    total: long;
}
export type SnapshotShardsStatsStage = 'DONE' | 'FAILURE' | 'FINALIZE' | 'INIT' | 'STARTED';
export interface SnapshotShardsStatsSummary {
    incremental: SnapshotShardsStatsSummaryItem;
    total: SnapshotShardsStatsSummaryItem;
    start_time_in_millis: EpochTime<UnitMillis>;
    time?: Duration;
    time_in_millis: DurationValue<UnitMillis>;
}
export interface SnapshotShardsStatsSummaryItem {
    file_count: long;
    size_in_bytes: long;
}
export interface SnapshotSharedFileSystemRepository extends SnapshotRepositoryBase {
    type: 'fs';
    settings: SnapshotSharedFileSystemRepositorySettings;
}
export interface SnapshotSharedFileSystemRepositorySettings extends SnapshotRepositorySettingsBase {
    location: string;
    max_number_of_snapshots?: integer;
    readonly?: boolean;
}
export interface SnapshotSnapshotIndexStats {
    shards: Record<string, SnapshotSnapshotShardsStatus>;
    shards_stats: SnapshotShardsStats;
    stats: SnapshotSnapshotStats;
}
export interface SnapshotSnapshotInfo {
    data_streams: string[];
    duration?: Duration;
    duration_in_millis?: DurationValue<UnitMillis>;
    end_time?: DateTime;
    end_time_in_millis?: EpochTime<UnitMillis>;
    failures?: SnapshotSnapshotShardFailure[];
    include_global_state?: boolean;
    indices?: IndexName[];
    index_details?: Record<IndexName, SnapshotIndexDetails>;
    metadata?: Metadata;
    reason?: string;
    repository?: Name;
    snapshot: Name;
    shards?: ShardStatistics;
    start_time?: DateTime;
    start_time_in_millis?: EpochTime<UnitMillis>;
    state?: string;
    uuid: Uuid;
    version?: VersionString;
    version_id?: VersionNumber;
    feature_states?: SnapshotInfoFeatureState[];
}
export interface SnapshotSnapshotShardFailure {
    index: IndexName;
    node_id?: Id;
    reason: string;
    shard_id: Id;
    status: string;
}
export interface SnapshotSnapshotShardsStatus {
    stage: SnapshotShardsStatsStage;
    stats: SnapshotShardsStatsSummary;
}
export type SnapshotSnapshotSort = 'start_time' | 'duration' | 'name' | 'index_count' | 'repository' | 'shard_count' | 'failed_shard_count';
export interface SnapshotSnapshotStats {
    incremental: SnapshotFileCountSnapshotStats;
    start_time_in_millis: EpochTime<UnitMillis>;
    time?: Duration;
    time_in_millis: DurationValue<UnitMillis>;
    total: SnapshotFileCountSnapshotStats;
}
export interface SnapshotSourceOnlyRepository extends SnapshotRepositoryBase {
    type: 'source';
    settings: SnapshotSourceOnlyRepositorySettings;
}
export interface SnapshotSourceOnlyRepositorySettings extends SnapshotRepositorySettingsBase {
    delegate_type?: string;
    max_number_of_snapshots?: integer;
    read_only?: boolean;
    readonly?: boolean;
}
export interface SnapshotStatus {
    include_global_state: boolean;
    indices: Record<string, SnapshotSnapshotIndexStats>;
    repository: string;
    shards_stats: SnapshotShardsStats;
    snapshot: string;
    state: string;
    stats: SnapshotSnapshotStats;
    uuid: Uuid;
}
export interface SnapshotCleanupRepositoryCleanupRepositoryResults {
    deleted_blobs: long;
    deleted_bytes: long;
}
export interface SnapshotCleanupRepositoryRequest extends RequestBase {
    name: Name;


}
export interface SnapshotCleanupRepositoryResponse {
    results: SnapshotCleanupRepositoryCleanupRepositoryResults;
}
export interface SnapshotCloneRequest extends RequestBase {
    repository: Name;
    snapshot: Name;
    target_snapshot: Name;


    indices: string;
}
export type SnapshotCloneResponse = AcknowledgedResponseBase;
export interface SnapshotCreateRequest extends RequestBase {
    repository: Name;
    snapshot: Name;

    wait_for_completion?: boolean;
    ignore_unavailable?: boolean;
    include_global_state?: boolean;
    indices?: Indices;
    feature_states?: string[];
    metadata?: Metadata;
    partial?: boolean;
}
export interface SnapshotCreateResponse {
    accepted?: boolean;
    snapshot?: SnapshotSnapshotInfo;
}
export interface SnapshotCreateRepositoryRequest extends RequestBase {
    name: Name;


    verify?: boolean;
    repository?: SnapshotRepository;
}
export type SnapshotCreateRepositoryResponse = AcknowledgedResponseBase;
export interface SnapshotDeleteRequest extends RequestBase {
    repository: Name;
    snapshot: Name;

}
export type SnapshotDeleteResponse = AcknowledgedResponseBase;
export interface SnapshotDeleteRepositoryRequest extends RequestBase {
    name: Names;


}
export type SnapshotDeleteRepositoryResponse = AcknowledgedResponseBase;
export interface SnapshotGetRequest extends RequestBase {
    repository: Name;
    snapshot: Names;
    ignore_unavailable?: boolean;

    verbose?: boolean;
    index_details?: boolean;
    index_names?: boolean;
    include_repository?: boolean;
    sort?: SnapshotSnapshotSort;
    size?: integer;
    order?: SortOrder;
    after?: string;
    offset?: integer;
    from_sort_value?: string;
    slm_policy_filter?: Name;
}
export interface SnapshotGetResponse {
    responses?: SnapshotGetSnapshotResponseItem[];
    snapshots?: SnapshotSnapshotInfo[];
    total: integer;
    remaining: integer;
}
export interface SnapshotGetSnapshotResponseItem {
    repository: Name;
    snapshots?: SnapshotSnapshotInfo[];
    error?: ErrorCause;
}
export interface SnapshotGetRepositoryRequest extends RequestBase {
    name?: Names;
    local?: boolean;

}
export type SnapshotGetRepositoryResponse = Record<string, SnapshotRepository>;
export interface SnapshotRestoreRequest extends RequestBase {
    repository: Name;
    snapshot: Name;

    wait_for_completion?: boolean;
    feature_states?: string[];
    ignore_index_settings?: string[];
    ignore_unavailable?: boolean;
    include_aliases?: boolean;
    include_global_state?: boolean;
    index_settings?: IndicesIndexSettings;
    indices?: Indices;
    partial?: boolean;
    rename_pattern?: string;
    rename_replacement?: string;
}
export interface SnapshotRestoreResponse {
    snapshot: SnapshotRestoreSnapshotRestore;
}
export interface SnapshotRestoreSnapshotRestore {
    indices: IndexName[];
    snapshot: string;
    shards: ShardStatistics;
}
export interface SnapshotStatusRequest extends RequestBase {
    repository?: Name;
    snapshot?: Names;
    ignore_unavailable?: boolean;

}
export interface SnapshotStatusResponse {
    snapshots: SnapshotStatus[];
}
export interface SnapshotVerifyRepositoryCompactNodeInfo {
    name: Name;
}
export interface SnapshotVerifyRepositoryRequest extends RequestBase {
    name: Name;


}
export interface SnapshotVerifyRepositoryResponse {
    nodes: Record<string, SnapshotVerifyRepositoryCompactNodeInfo>;
}
export interface SqlColumn {
    name: Name;
    type: string;
}
export type SqlRow = any[];
export interface SqlClearCursorRequest extends RequestBase {
    cursor: string;
}
export interface SqlClearCursorResponse {
    succeeded: boolean;
}
export interface SqlDeleteAsyncRequest extends RequestBase {
    id: Id;
}
export type SqlDeleteAsyncResponse = AcknowledgedResponseBase;
export interface SqlGetAsyncRequest extends RequestBase {
    id: Id;
    delimiter?: string;
    format?: string;
    keep_alive?: Duration;

}
export interface SqlGetAsyncResponse {
    id: Id;
    is_running: boolean;
    is_partial: boolean;
    columns?: SqlColumn[];
    cursor?: string;
    rows: SqlRow[];
}
export interface SqlGetAsyncStatusRequest extends RequestBase {
    id: Id;
}
export interface SqlGetAsyncStatusResponse {
    id: string;
    is_running: boolean;
    is_partial: boolean;
    start_time_in_millis: EpochTime<UnitMillis>;
    expiration_time_in_millis: EpochTime<UnitMillis>;
    completion_status?: uint;
}
export interface SqlQueryRequest extends RequestBase {
    format?: string;
    catalog?: string;
    columnar?: boolean;
    cursor?: string;
    fetch_size?: integer;
    filter?: QueryDslQueryContainer;
    query?: string;


    time_zone?: TimeZone;
    field_multi_value_leniency?: boolean;
    runtime_mappings?: MappingRuntimeFields;

    params?: Record<string, any>;
    keep_alive?: Duration;
    keep_on_completion?: boolean;
    index_using_frozen?: boolean;
}
export interface SqlQueryResponse {
    id?: Id;
    is_running?: boolean;
    is_partial?: boolean;
    columns?: SqlColumn[];
    cursor?: string;
    rows: SqlRow[];
}
export interface SqlTranslateRequest extends RequestBase {
    fetch_size?: integer;
    filter?: QueryDslQueryContainer;
    query: string;
    time_zone?: TimeZone;
}
export interface SqlTranslateResponse {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    size?: long;
    _source?: SearchSourceConfig;
    fields?: (QueryDslFieldAndFormat | Field)[];
    query?: QueryDslQueryContainer;
    sort?: Sort;
}
export interface SslCertificatesCertificateInformation {
    alias: string | null;
    expiry: DateTime;
    format: string;
    has_private_key: boolean;
    issuer?: string;
    path: string;
    serial_number: string;
    subject_dn: string;
}
export interface SslCertificatesRequest extends RequestBase {
}
export type SslCertificatesResponse = SslCertificatesCertificateInformation[];
export interface SynonymsSynonymRule {
    id?: Id;
    synonyms: SynonymsSynonymString;
}
export interface SynonymsSynonymRuleRead {
    id: Id;
    synonyms: SynonymsSynonymString;
}
export type SynonymsSynonymString = string;
export interface SynonymsSynonymsUpdateResult {
    result: Result;
    reload_analyzers_details: IndicesReloadSearchAnalyzersReloadResult;
}
export interface SynonymsDeleteSynonymRequest extends RequestBase {
    id: Id;
}
export type SynonymsDeleteSynonymResponse = AcknowledgedResponseBase;
export interface SynonymsDeleteSynonymRuleRequest extends RequestBase {
    set_id: Id;
    rule_id: Id;
}
export type SynonymsDeleteSynonymRuleResponse = SynonymsSynonymsUpdateResult;
export interface SynonymsGetSynonymRequest extends RequestBase {
    id: Id;
    from?: integer;
    size?: integer;
}
export interface SynonymsGetSynonymResponse {
    count: integer;
    synonyms_set: SynonymsSynonymRuleRead[];
}
export interface SynonymsGetSynonymRuleRequest extends RequestBase {
    set_id: Id;
    rule_id: Id;
}
export type SynonymsGetSynonymRuleResponse = SynonymsSynonymRuleRead;
export interface SynonymsGetSynonymsSetsRequest extends RequestBase {
    from?: integer;
    size?: integer;
}
export interface SynonymsGetSynonymsSetsResponse {
    count: integer;
    results: SynonymsGetSynonymsSetsSynonymsSetItem[];
}
export interface SynonymsGetSynonymsSetsSynonymsSetItem {
    synonyms_set: Id;
    count: integer;
}
export interface SynonymsPutSynonymRequest extends RequestBase {
    id: Id;
    synonyms_set: SynonymsSynonymRule[];
}
export interface SynonymsPutSynonymResponse {
    result: Result;
    reload_analyzers_details: IndicesReloadSearchAnalyzersReloadResult;
}
export interface SynonymsPutSynonymRuleRequest extends RequestBase {
    set_id: Id;
    rule_id: Id;
    synonyms: SynonymsSynonymString;
}
export type SynonymsPutSynonymRuleResponse = SynonymsSynonymsUpdateResult;
export type TasksGroupBy = 'nodes' | 'parents' | 'none';
export interface TasksNodeTasks {
    name?: NodeId;
    transport_address?: TransportAddress;
    host?: Host;
    ip?: Ip;
    roles?: string[];
    attributes?: Record<string, string>;
    tasks: Record<TaskId, TasksTaskInfo>;
}
export interface TasksParentTaskInfo extends TasksTaskInfo {
    children?: TasksTaskInfo[];
}
export interface TasksTaskInfo {
    action: string;
    cancelled?: boolean;
    cancellable: boolean;
    description?: string;
    headers: Record<string, string>;
    id: long;
    node: NodeId;
    running_time?: Duration;
    running_time_in_nanos: DurationValue<UnitNanos>;
    start_time_in_millis: EpochTime<UnitMillis>;
    status?: any;
    type: string;
    parent_task_id?: TaskId;
}
export type TasksTaskInfos = TasksTaskInfo[] | Record<string, TasksParentTaskInfo>;
export interface TasksTaskListResponseBase {
    node_failures?: ErrorCause[];
    task_failures?: TaskFailure[];
    nodes?: Record<string, TasksNodeTasks>;
    tasks?: TasksTaskInfos;
}
export interface TasksCancelRequest extends RequestBase {
    task_id?: TaskId;
    actions?: string | string[];
    nodes?: string[];
    parent_task_id?: string;
    wait_for_completion?: boolean;
}
export type TasksCancelResponse = TasksTaskListResponseBase;
export interface TasksGetRequest extends RequestBase {
    task_id: Id;

    wait_for_completion?: boolean;
}
export interface TasksGetResponse {
    completed: boolean;
    task: TasksTaskInfo;
    response?: any;
    error?: ErrorCause;
}
export interface TasksListRequest extends RequestBase {
    actions?: string | string[];
    detailed?: boolean;
    group_by?: TasksGroupBy;
    node_id?: string[];
    parent_task_id?: Id;


    wait_for_completion?: boolean;
}
export type TasksListResponse = TasksTaskListResponseBase;
export interface TextStructureFindStructureFieldStat {
    count: integer;
    cardinality: integer;
    top_hits: TextStructureFindStructureTopHit[];
    mean_value?: integer;
    median_value?: integer;
    max_value?: integer;
    min_value?: integer;
    earliest?: string;
    latest?: string;
}
export interface TextStructureFindStructureRequest<TJsonDocument = unknown> {
    charset?: string;
    column_names?: string;
    delimiter?: string;
    ecs_compatibility?: string;
    explain?: boolean;
    format?: string;
    grok_pattern?: string;
    has_header_row?: boolean;
    line_merge_size_limit?: uint;
    lines_to_sample?: uint;
    quote?: string;
    should_trim_fields?: boolean;

    timestamp_field?: Field;
    timestamp_format?: string;
    text_files?: TJsonDocument[];
}
export interface TextStructureFindStructureResponse {
    charset: string;
    has_header_row?: boolean;
    has_byte_order_marker: boolean;
    format: string;
    field_stats: Record<Field, TextStructureFindStructureFieldStat>;
    sample_start: string;
    num_messages_analyzed: integer;
    mappings: MappingTypeMapping;
    quote?: string;
    delimiter?: string;
    need_client_timezone: boolean;
    num_lines_analyzed: integer;
    column_names?: string[];
    explanation?: string[];
    grok_pattern?: string;
    multiline_start_pattern?: string;
    exclude_lines_pattern?: string;
    java_timestamp_formats?: string[];
    joda_timestamp_formats?: string[];
    timestamp_field?: Field;
    should_trim_fields?: boolean;
    ingest_pipeline: IngestPipelineConfig;
}
export interface TextStructureFindStructureTopHit {
    count: long;
    value: any;
}
export interface TextStructureTestGrokPatternMatchedField {
    match: string;
    offset: integer;
    length: integer;
}
export interface TextStructureTestGrokPatternMatchedText {
    matched: boolean;
    fields?: Record<string, TextStructureTestGrokPatternMatchedField[]>;
}
export interface TextStructureTestGrokPatternRequest extends RequestBase {
    ecs_compatibility?: string;
    grok_pattern: string;
    text: string[];
}
export interface TextStructureTestGrokPatternResponse {
    matches: TextStructureTestGrokPatternMatchedText[];
}
export interface TransformDestination {
    index?: IndexName;
    pipeline?: string;
}
export interface TransformLatest {
    sort: Field;
    unique_key: Field[];
}
export interface TransformPivot {
    aggregations?: Record<string, AggregationsAggregationContainer>;
    aggs?: Record<string, AggregationsAggregationContainer>;
    group_by?: Record<string, TransformPivotGroupByContainer>;
}
export interface TransformPivotGroupByContainer {
    date_histogram?: AggregationsDateHistogramAggregation;
    geotile_grid?: AggregationsGeoTileGridAggregation;
    histogram?: AggregationsHistogramAggregation;
    terms?: AggregationsTermsAggregation;
}
export interface TransformRetentionPolicy {
    field: Field;
    max_age: Duration;
}
export interface TransformRetentionPolicyContainer {
    time?: TransformRetentionPolicy;
}
export interface TransformSettings {
    align_checkpoints?: boolean;
    dates_as_epoch_millis?: boolean;
    deduce_mappings?: boolean;
    docs_per_second?: float;
    max_page_search_size?: integer;
    unattended?: boolean;
}
export interface TransformSource {
    index: Indices;
    query?: QueryDslQueryContainer;
    runtime_mappings?: MappingRuntimeFields;
}
export interface TransformSyncContainer {
    time?: TransformTimeSync;
}
export interface TransformTimeSync {
    delay?: Duration;
    field: Field;
}
export interface TransformDeleteTransformRequest extends RequestBase {
    transform_id: Id;
    force?: boolean;
    delete_dest_index?: boolean;

}
export type TransformDeleteTransformResponse = AcknowledgedResponseBase;
export interface TransformGetTransformRequest extends RequestBase {
    transform_id?: Names;
    allow_no_match?: boolean;
    from?: integer;
    size?: integer;
    exclude_generated?: boolean;
}
export interface TransformGetTransformResponse {
    count: long;
    transforms: TransformGetTransformTransformSummary[];
}
export interface TransformGetTransformTransformSummary {
    authorization?: MlTransformAuthorization;
    create_time?: EpochTime<UnitMillis>;
    description?: string;
    dest: ReindexDestination;
    frequency?: Duration;
    id: Id;
    latest?: TransformLatest;
    pivot?: TransformPivot;
    retention_policy?: TransformRetentionPolicyContainer;
    settings?: TransformSettings;
    source: TransformSource;
    sync?: TransformSyncContainer;
    version?: VersionString;
    _meta?: Metadata;
}
export interface TransformGetTransformStatsCheckpointStats {
    checkpoint: long;
    checkpoint_progress?: TransformGetTransformStatsTransformProgress;
    timestamp?: DateTime;
    timestamp_millis?: EpochTime<UnitMillis>;
    time_upper_bound?: DateTime;
    time_upper_bound_millis?: EpochTime<UnitMillis>;
}
export interface TransformGetTransformStatsCheckpointing {
    changes_last_detected_at?: long;
    changes_last_detected_at_date_time?: DateTime;
    last: TransformGetTransformStatsCheckpointStats;
    next?: TransformGetTransformStatsCheckpointStats;
    operations_behind?: long;
    last_search_time?: long;
}
export interface TransformGetTransformStatsRequest extends RequestBase {
    transform_id: Names;
    allow_no_match?: boolean;
    from?: long;
    size?: long;

}
export interface TransformGetTransformStatsResponse {
    count: long;
    transforms: TransformGetTransformStatsTransformStats[];
}
export interface TransformGetTransformStatsTransformIndexerStats {
    delete_time_in_ms?: EpochTime<UnitMillis>;
    documents_indexed: long;
    documents_deleted?: long;
    documents_processed: long;
    exponential_avg_checkpoint_duration_ms: DurationValue<UnitFloatMillis>;
    exponential_avg_documents_indexed: double;
    exponential_avg_documents_processed: double;
    index_failures: long;
    index_time_in_ms: DurationValue<UnitMillis>;
    index_total: long;
    pages_processed: long;
    processing_time_in_ms: DurationValue<UnitMillis>;
    processing_total: long;
    search_failures: long;
    search_time_in_ms: DurationValue<UnitMillis>;
    search_total: long;
    trigger_count: long;
}
export interface TransformGetTransformStatsTransformProgress {
    docs_indexed: long;
    docs_processed: long;
    docs_remaining?: long;
    percent_complete?: double;
    total_docs?: long;
}
export interface TransformGetTransformStatsTransformStats {
    checkpointing: TransformGetTransformStatsCheckpointing;
    health?: TransformGetTransformStatsTransformStatsHealth;
    id: Id;
    node?: NodeAttributes;
    reason?: string;
    state: string;
    stats: TransformGetTransformStatsTransformIndexerStats;
}
export interface TransformGetTransformStatsTransformStatsHealth {
    status: HealthStatus;
}
export interface TransformPreviewTransformRequest extends RequestBase {
    transform_id?: Id;

    dest?: TransformDestination;
    description?: string;
    frequency?: Duration;
    pivot?: TransformPivot;
    source?: TransformSource;
    settings?: TransformSettings;
    sync?: TransformSyncContainer;
    retention_policy?: TransformRetentionPolicyContainer;
    latest?: TransformLatest;
}
export interface TransformPreviewTransformResponse<TTransform = unknown> {
    generated_dest_index: IndicesIndexState;
    preview: TTransform[];
}
export interface TransformPutTransformRequest extends RequestBase {
    transform_id: Id;
    defer_validation?: boolean;

    dest: TransformDestination;
    description?: string;
    frequency?: Duration;
    latest?: TransformLatest;
    _meta?: Metadata;
    pivot?: TransformPivot;
    retention_policy?: TransformRetentionPolicyContainer;
    settings?: TransformSettings;
    source: TransformSource;
    sync?: TransformSyncContainer;
}
export type TransformPutTransformResponse = AcknowledgedResponseBase;
export interface TransformResetTransformRequest extends RequestBase {
    transform_id: Id;
    force?: boolean;
}
export type TransformResetTransformResponse = AcknowledgedResponseBase;
export interface TransformScheduleNowTransformRequest extends RequestBase {
    transform_id: Id;

}
export type TransformScheduleNowTransformResponse = AcknowledgedResponseBase;
export interface TransformStartTransformRequest extends RequestBase {
    transform_id: Id;

    from?: string;
}
export type TransformStartTransformResponse = AcknowledgedResponseBase;
export interface TransformStopTransformRequest extends RequestBase {
    transform_id: Name;
    allow_no_match?: boolean;
    force?: boolean;

    wait_for_checkpoint?: boolean;
    wait_for_completion?: boolean;
}
export type TransformStopTransformResponse = AcknowledgedResponseBase;
export interface TransformUpdateTransformRequest extends RequestBase {
    transform_id: Id;
    defer_validation?: boolean;

    dest?: TransformDestination;
    description?: string;
    frequency?: Duration;
    _meta?: Metadata;
    source?: TransformSource;
    settings?: TransformSettings;
    sync?: TransformSyncContainer;
    retention_policy?: TransformRetentionPolicyContainer | null;
}
export interface TransformUpdateTransformResponse {
    authorization?: MlTransformAuthorization;
    create_time: long;
    description: string;
    dest: ReindexDestination;
    frequency?: Duration;
    id: Id;
    latest?: TransformLatest;
    pivot?: TransformPivot;
    retention_policy?: TransformRetentionPolicyContainer;
    settings: TransformSettings;
    source: ReindexSource;
    sync?: TransformSyncContainer;
    version: VersionString;
    _meta?: Metadata;
}
export interface TransformUpgradeTransformsRequest extends RequestBase {
    dry_run?: boolean;

}
export interface TransformUpgradeTransformsResponse {
    needs_update: integer;
    no_action: integer;
    updated: integer;
}
export interface WatcherAcknowledgeState {
    state: WatcherAcknowledgementOptions;
    timestamp: DateTime;
}
export type WatcherAcknowledgementOptions = 'awaits_successful_execution' | 'ackable' | 'acked';
export interface WatcherAction {
    action_type?: WatcherActionType;
    condition?: WatcherConditionContainer;
    foreach?: string;
    max_iterations?: integer;
    name?: Name;
    throttle_period?: Duration;
    throttle_period_in_millis?: DurationValue<UnitMillis>;
    transform?: TransformContainer;
    index?: WatcherIndexAction;
    logging?: WatcherLoggingAction;
    email?: WatcherEmailAction;
    pagerduty?: WatcherPagerDutyAction;
    slack?: WatcherSlackAction;
    webhook?: WatcherWebhookAction;
}
export type WatcherActionExecutionMode = 'simulate' | 'force_simulate' | 'execute' | 'force_execute' | 'skip';
export interface WatcherActionStatus {
    ack: WatcherAcknowledgeState;
    last_execution?: WatcherExecutionState;
    last_successful_execution?: WatcherExecutionState;
    last_throttle?: WatcherThrottleState;
}
export type WatcherActionStatusOptions = 'success' | 'failure' | 'simulated' | 'throttled';
export type WatcherActionType = 'email' | 'webhook' | 'index' | 'logging' | 'slack' | 'pagerduty';
export type WatcherActions = Record<IndexName, WatcherActionStatus>;
export interface WatcherActivationState {
    active: boolean;
    timestamp: DateTime;
}
export interface WatcherActivationStatus {
    actions: WatcherActions;
    state: WatcherActivationState;
    version: VersionNumber;
}
export interface WatcherAlwaysCondition {
}
export interface WatcherArrayCompareConditionKeys {
    path: string;
}
export type WatcherArrayCompareCondition = WatcherArrayCompareConditionKeys & {
    [property: string]: WatcherArrayCompareOpParams | string;
};
export interface WatcherArrayCompareOpParams {
    quantifier: WatcherQuantifier;
    value: FieldValue;
}
export interface WatcherChainInput {
    inputs: Partial<Record<string, WatcherInputContainer>>[];
}
export interface WatcherConditionContainer {
    always?: WatcherAlwaysCondition;
    array_compare?: Partial<Record<string, WatcherArrayCompareCondition>>;
    compare?: Partial<Record<string, Partial<Record<WatcherConditionOp, FieldValue>>>>;
    never?: WatcherNeverCondition;
    script?: WatcherScriptCondition;
}
export type WatcherConditionOp = 'not_eq' | 'eq' | 'lt' | 'gt' | 'lte' | 'gte';
export type WatcherConditionType = 'always' | 'never' | 'script' | 'compare' | 'array_compare';
export type WatcherConnectionScheme = 'http' | 'https';
export type WatcherCronExpression = string;
export interface WatcherDailySchedule {
    at: WatcherScheduleTimeOfDay[];
}
export type WatcherDataAttachmentFormat = 'json' | 'yaml';
export interface WatcherDataEmailAttachment {
    format?: WatcherDataAttachmentFormat;
}
export type WatcherDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export interface WatcherEmail {
    id?: Id;
    bcc?: string[];
    body?: WatcherEmailBody;
    cc?: string[];
    from?: string;
    priority?: WatcherEmailPriority;
    reply_to?: string[];
    sent_date?: DateTime;
    subject: string;
    to: string[];
    attachments?: Record<string, WatcherEmailAttachmentContainer>;
}
export interface WatcherEmailAction extends WatcherEmail {
}
export interface WatcherEmailAttachmentContainer {
    http?: WatcherHttpEmailAttachment;
    reporting?: WatcherReportingEmailAttachment;
    data?: WatcherDataEmailAttachment;
}
export interface WatcherEmailBody {
    html?: string;
    text?: string;
}
export type WatcherEmailPriority = 'lowest' | 'low' | 'normal' | 'high' | 'highest';
export interface WatcherEmailResult {
    account?: string;
    message: WatcherEmail;
    reason?: string;
}
export type WatcherExecutionPhase = 'awaits_execution' | 'started' | 'input' | 'condition' | 'actions' | 'watch_transform' | 'aborted' | 'finished';
export interface WatcherExecutionResult {
    actions: WatcherExecutionResultAction[];
    condition: WatcherExecutionResultCondition;
    execution_duration: DurationValue<UnitMillis>;
    execution_time: DateTime;
    input: WatcherExecutionResultInput;
}
export interface WatcherExecutionResultAction {
    email?: WatcherEmailResult;
    id: Id;
    index?: WatcherIndexResult;
    logging?: WatcherLoggingResult;
    pagerduty?: WatcherPagerDutyResult;
    reason?: string;
    slack?: WatcherSlackResult;
    status: WatcherActionStatusOptions;
    type: WatcherActionType;
    webhook?: WatcherWebhookResult;
    error?: ErrorCause;
}
export interface WatcherExecutionResultCondition {
    met: boolean;
    status: WatcherActionStatusOptions;
    type: WatcherConditionType;
}
export interface WatcherExecutionResultInput {
    payload: Record<string, any>;
    status: WatcherActionStatusOptions;
    type: WatcherInputType;
}
export interface WatcherExecutionState {
    successful: boolean;
    timestamp: DateTime;
    reason?: string;
}
export type WatcherExecutionStatus = 'awaits_execution' | 'checking' | 'execution_not_needed' | 'throttled' | 'executed' | 'failed' | 'deleted_while_queued' | 'not_executed_already_queued';
export interface WatcherExecutionThreadPool {
    max_size: long;
    queue_size: long;
}
export interface WatcherHourAndMinute {
    hour: integer[];
    minute: integer[];
}
export interface WatcherHourlySchedule {
    minute: integer[];
}
export interface WatcherHttpEmailAttachment {
    content_type?: string;
    inline?: boolean;
    request?: WatcherHttpInputRequestDefinition;
}
export interface WatcherHttpInput {
    extract?: string[];
    request?: WatcherHttpInputRequestDefinition;
    response_content_type?: WatcherResponseContentType;
}
export interface WatcherHttpInputAuthentication {
    basic: WatcherHttpInputBasicAuthentication;
}
export interface WatcherHttpInputBasicAuthentication {
    password: Password;
    username: Username;
}
export type WatcherHttpInputMethod = 'head' | 'get' | 'post' | 'put' | 'delete';
export interface WatcherHttpInputProxy {
    host: Host;
    port: uint;
}
export interface WatcherHttpInputRequestDefinition {
    auth?: WatcherHttpInputAuthentication;
    body?: string;

    headers?: Record<string, string>;
    host?: Host;
    method?: WatcherHttpInputMethod;
    params?: Record<string, string>;
    path?: string;
    port?: uint;
    proxy?: WatcherHttpInputProxy;

    scheme?: WatcherConnectionScheme;
    url?: string;
}
export interface WatcherHttpInputRequestResult extends WatcherHttpInputRequestDefinition {
}
export interface WatcherHttpInputResponseResult {
    body: string;
    headers: HttpHeaders;
    status: integer;
}
export interface WatcherIndexAction {
    index: IndexName;
    doc_id?: Id;
    refresh?: Refresh;
    op_type?: OpType;

    execution_time_field?: Field;
}
export interface WatcherIndexResult {
    response: WatcherIndexResultSummary;
}
export interface WatcherIndexResultSummary {
    created: boolean;
    id: Id;
    index: IndexName;
    result: Result;
    version: VersionNumber;
}
export interface WatcherInputContainer {
    chain?: WatcherChainInput;
    http?: WatcherHttpInput;
    search?: WatcherSearchInput;
    simple?: Record<string, any>;
}
export type WatcherInputType = 'http' | 'search' | 'simple';
export interface WatcherLoggingAction {
    level?: string;
    text: string;
    category?: string;
}
export interface WatcherLoggingResult {
    logged_text: string;
}
export type WatcherMonth = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';
export interface WatcherNeverCondition {
}
export interface WatcherPagerDutyAction extends WatcherPagerDutyEvent {
}
export interface WatcherPagerDutyContext {
    href?: string;
    src?: string;
    type: WatcherPagerDutyContextType;
}
export type WatcherPagerDutyContextType = 'link' | 'image';
export interface WatcherPagerDutyEvent {
    account?: string;
    attach_payload: boolean;
    client?: string;
    client_url?: string;
    contexts?: WatcherPagerDutyContext[];
    context?: WatcherPagerDutyContext[];
    description: string;
    event_type?: WatcherPagerDutyEventType;
    incident_key: string;
    proxy?: WatcherPagerDutyEventProxy;
}
export interface WatcherPagerDutyEventProxy {
    host?: Host;
    port?: integer;
}
export type WatcherPagerDutyEventType = 'trigger' | 'resolve' | 'acknowledge';
export interface WatcherPagerDutyResult {
    event: WatcherPagerDutyEvent;
    reason?: string;
    request?: WatcherHttpInputRequestResult;
    response?: WatcherHttpInputResponseResult;
}
export type WatcherQuantifier = 'some' | 'all';
export interface WatcherQueryWatch {
    _id: Id;
    status?: WatcherWatchStatus;
    watch?: WatcherWatch;
    _primary_term?: integer;
    _seq_no?: SequenceNumber;
}
export interface WatcherReportingEmailAttachment {
    url: string;
    inline?: boolean;
    retries?: integer;
    interval?: Duration;
    request?: WatcherHttpInputRequestDefinition;
}
export type WatcherResponseContentType = 'json' | 'yaml' | 'text';
export interface WatcherScheduleContainer {
    cron?: WatcherCronExpression;
    daily?: WatcherDailySchedule;
    hourly?: WatcherHourlySchedule;
    interval?: Duration;
    monthly?: WatcherTimeOfMonth | WatcherTimeOfMonth[];
    weekly?: WatcherTimeOfWeek | WatcherTimeOfWeek[];
    yearly?: WatcherTimeOfYear | WatcherTimeOfYear[];
}
export type WatcherScheduleTimeOfDay = string | WatcherHourAndMinute;
export interface WatcherScheduleTriggerEvent {
    scheduled_time: DateTime;
    triggered_time?: DateTime;
}
export interface WatcherScriptCondition {
    lang?: string;
    params?: Record<string, any>;
    source?: string;
    id?: string;
}
export interface WatcherSearchInput {
    extract?: string[];
    request: WatcherSearchInputRequestDefinition;

}
export interface WatcherSearchInputRequestBody {
    query: QueryDslQueryContainer;
}
export interface WatcherSearchInputRequestDefinition {
    body?: WatcherSearchInputRequestBody;
    indices?: IndexName[];
    indices_options?: IndicesOptions;
    search_type?: SearchType;
    template?: WatcherSearchTemplateRequestBody;
    rest_total_hits_as_int?: boolean;
}
export interface WatcherSearchTemplateRequestBody {
    explain?: boolean;
    id?: Id;
    params?: Record<string, any>;
    profile?: boolean;
    source?: string;
}
export interface WatcherSimulatedActions {
    actions: string[];
    all: WatcherSimulatedActions;
    use_all: boolean;
}
export interface WatcherSlackAction {
    account?: string;
    message: WatcherSlackMessage;
}
export interface WatcherSlackAttachment {
    author_icon?: string;
    author_link?: string;
    author_name: string;
    color?: string;
    fallback?: string;
    fields?: WatcherSlackAttachmentField[];
    footer?: string;
    footer_icon?: string;
    image_url?: string;
    pretext?: string;
    text?: string;
    thumb_url?: string;
    title: string;
    title_link?: string;
    ts?: EpochTime<UnitSeconds>;
}
export interface WatcherSlackAttachmentField {
    short: boolean;
    title: string;
    value: string;
}
export interface WatcherSlackDynamicAttachment {
    attachment_template: WatcherSlackAttachment;
    list_path: string;
}
export interface WatcherSlackMessage {
    attachments: WatcherSlackAttachment[];
    dynamic_attachments?: WatcherSlackDynamicAttachment;
    from: string;
    icon?: string;
    text: string;
    to: string[];
}
export interface WatcherSlackResult {
    account?: string;
    message: WatcherSlackMessage;
}
export interface WatcherThrottleState {
    reason: string;
    timestamp: DateTime;
}
export interface WatcherTimeOfMonth {
    at: string[];
    on: integer[];
}
export interface WatcherTimeOfWeek {
    at: string[];
    on: WatcherDay[];
}
export interface WatcherTimeOfYear {
    at: string[];
    int: WatcherMonth[];
    on: integer[];
}
export interface WatcherTriggerContainer {
    schedule?: WatcherScheduleContainer;
}
export interface WatcherTriggerEventContainer {
    schedule?: WatcherScheduleTriggerEvent;
}
export interface WatcherTriggerEventResult {
    manual: WatcherTriggerEventContainer;
    triggered_time: DateTime;
    type: string;
}
export interface WatcherWatch {
    actions: Record<IndexName, WatcherAction>;
    condition: WatcherConditionContainer;
    input: WatcherInputContainer;
    metadata?: Metadata;
    status?: WatcherWatchStatus;
    throttle_period?: Duration;
    throttle_period_in_millis?: DurationValue<UnitMillis>;
    transform?: TransformContainer;
    trigger: WatcherTriggerContainer;
}
export interface WatcherWatchStatus {
    actions: WatcherActions;
    last_checked?: DateTime;
    last_met_condition?: DateTime;
    state: WatcherActivationState;
    version: VersionNumber;
    execution_state?: string;
}
export interface WatcherWebhookAction extends WatcherHttpInputRequestDefinition {
}
export interface WatcherWebhookResult {
    request: WatcherHttpInputRequestResult;
    response?: WatcherHttpInputResponseResult;
}
export interface WatcherAckWatchRequest extends RequestBase {
    watch_id: Name;
    action_id?: Names;
}
export interface WatcherAckWatchResponse {
    status: WatcherWatchStatus;
}
export interface WatcherActivateWatchRequest extends RequestBase {
    watch_id: Name;
}
export interface WatcherActivateWatchResponse {
    status: WatcherActivationStatus;
}
export interface WatcherDeactivateWatchRequest extends RequestBase {
    watch_id: Name;
}
export interface WatcherDeactivateWatchResponse {
    status: WatcherActivationStatus;
}
export interface WatcherDeleteWatchRequest extends RequestBase {
    id: Name;
}
export interface WatcherDeleteWatchResponse {
    found: boolean;
    _id: Id;
    _version: VersionNumber;
}
export interface WatcherExecuteWatchRequest extends RequestBase {
    id?: Id;
    debug?: boolean;
    action_modes?: Record<string, WatcherActionExecutionMode>;
    alternative_input?: Record<string, any>;
    ignore_condition?: boolean;
    record_execution?: boolean;
    simulated_actions?: WatcherSimulatedActions;
    trigger_data?: WatcherScheduleTriggerEvent;
    watch?: WatcherWatch;
}
export interface WatcherExecuteWatchResponse {
    _id: Id;
    watch_record: WatcherExecuteWatchWatchRecord;
}
export interface WatcherExecuteWatchWatchRecord {
    condition: WatcherConditionContainer;
    input: WatcherInputContainer;
    messages: string[];
    metadata?: Metadata;
    node: string;
    result: WatcherExecutionResult;
    state: WatcherExecutionStatus;
    trigger_event: WatcherTriggerEventResult;
    user: Username;
    watch_id: Id;
    status?: WatcherWatchStatus;
}
export interface WatcherGetWatchRequest extends RequestBase {
    id: Name;
}
export interface WatcherGetWatchResponse {
    found: boolean;
    _id: Id;
    status?: WatcherWatchStatus;
    watch?: WatcherWatch;
    _primary_term?: integer;
    _seq_no?: SequenceNumber;
    _version?: VersionNumber;
}
export interface WatcherPutWatchRequest extends RequestBase {
    id: Id;
    active?: boolean;
    if_primary_term?: long;
    if_seq_no?: SequenceNumber;
    version?: VersionNumber;
    actions?: Record<string, WatcherAction>;
    condition?: WatcherConditionContainer;
    input?: WatcherInputContainer;
    metadata?: Metadata;
    throttle_period?: string;
    transform?: TransformContainer;
    trigger?: WatcherTriggerContainer;
}
export interface WatcherPutWatchResponse {
    created: boolean;
    _id: Id;
    _primary_term: long;
    _seq_no: SequenceNumber;
    _version: VersionNumber;
}
export interface WatcherQueryWatchesRequest extends RequestBase {
    from?: integer;
    size?: integer;
    query?: QueryDslQueryContainer;
    sort?: Sort;
    search_after?: SortResults;
}
export interface WatcherQueryWatchesResponse {
    count: integer;
    watches: WatcherQueryWatch[];
}
export interface WatcherStartRequest extends RequestBase {
}
export type WatcherStartResponse = AcknowledgedResponseBase;
export interface WatcherStatsRequest extends RequestBase {
    metric?: WatcherStatsWatcherMetric | WatcherStatsWatcherMetric[];
    emit_stacktraces?: boolean;
}
export interface WatcherStatsResponse {
    _nodes: NodeStatistics;
    cluster_name: Name;
    manually_stopped: boolean;
    stats: WatcherStatsWatcherNodeStats[];
}
export interface WatcherStatsWatchRecordQueuedStats {
    execution_time: DateTime;
}
export interface WatcherStatsWatchRecordStats extends WatcherStatsWatchRecordQueuedStats {
    execution_phase: WatcherExecutionPhase;
    triggered_time: DateTime;
    executed_actions?: string[];
    watch_id: Id;
    watch_record_id: Id;
}
export type WatcherStatsWatcherMetric = '_all' | 'all' | 'queued_watches' | 'current_watches' | 'pending_watches';
export interface WatcherStatsWatcherNodeStats {
    current_watches?: WatcherStatsWatchRecordStats[];
    execution_thread_pool: WatcherExecutionThreadPool;
    queued_watches?: WatcherStatsWatchRecordQueuedStats[];
    watch_count: long;
    watcher_state: WatcherStatsWatcherState;
    node_id: Id;
}
export type WatcherStatsWatcherState = 'stopped' | 'starting' | 'started' | 'stopping';
export interface WatcherStopRequest extends RequestBase {
}
export type WatcherStopResponse = AcknowledgedResponseBase;
export interface XpackInfoBuildInformation {
    date: DateTime;
    hash: string;
}
export interface XpackInfoFeature {
    available: boolean;
    description?: string;
    enabled: boolean;
    native_code_info?: XpackInfoNativeCodeInformation;
}
export interface XpackInfoFeatures {
    aggregate_metric: XpackInfoFeature;
    analytics: XpackInfoFeature;
    ccr: XpackInfoFeature;
    data_frame?: XpackInfoFeature;
    data_science?: XpackInfoFeature;
    data_streams: XpackInfoFeature;
    data_tiers: XpackInfoFeature;
    enrich: XpackInfoFeature;
    eql: XpackInfoFeature;
    flattened?: XpackInfoFeature;
    frozen_indices: XpackInfoFeature;
    graph: XpackInfoFeature;
    ilm: XpackInfoFeature;
    logstash: XpackInfoFeature;
    ml: XpackInfoFeature;
    monitoring: XpackInfoFeature;
    rollup: XpackInfoFeature;
    runtime_fields?: XpackInfoFeature;
    searchable_snapshots: XpackInfoFeature;
    security: XpackInfoFeature;
    slm: XpackInfoFeature;
    spatial: XpackInfoFeature;
    sql: XpackInfoFeature;
    transform: XpackInfoFeature;
    vectors?: XpackInfoFeature;
    voting_only: XpackInfoFeature;
    watcher: XpackInfoFeature;
    archive: XpackInfoFeature;
}
export interface XpackInfoMinimalLicenseInformation {
    expiry_date_in_millis: EpochTime<UnitMillis>;
    mode: LicenseLicenseType;
    status: LicenseLicenseStatus;
    type: LicenseLicenseType;
    uid: string;
}
export interface XpackInfoNativeCodeInformation {
    build_hash: string;
    version: VersionString;
}
export interface XpackInfoRequest extends RequestBase {
    categories?: string[];
    accept_enterprise?: boolean;
    human?: boolean;
}
export interface XpackInfoResponse {
    build: XpackInfoBuildInformation;
    features: XpackInfoFeatures;
    license: XpackInfoMinimalLicenseInformation;
    tagline: string;
}
export interface XpackUsageAnalytics extends XpackUsageBase {
    stats: XpackUsageAnalyticsStatistics;
}
export interface XpackUsageAnalyticsStatistics {
    boxplot_usage: long;
    cumulative_cardinality_usage: long;
    string_stats_usage: long;
    top_metrics_usage: long;
    t_test_usage: long;
    moving_percentiles_usage: long;
    normalize_usage: long;
    rate_usage: long;
    multi_terms_usage?: long;
}
export interface XpackUsageArchive extends XpackUsageBase {
    indices_count: long;
}
export interface XpackUsageAudit extends XpackUsageFeatureToggle {
    outputs?: string[];
}
export interface XpackUsageBase {
    available: boolean;
    enabled: boolean;
}
export interface XpackUsageCcr extends XpackUsageBase {
    auto_follow_patterns_count: integer;
    follower_indices_count: integer;
}
export interface XpackUsageCounter {
    active: long;
    total: long;
}
export interface XpackUsageDataStreams extends XpackUsageBase {
    data_streams: long;
    indices_count: long;
}
export interface XpackUsageDataTierPhaseStatistics {
    node_count: long;
    index_count: long;
    total_shard_count: long;
    primary_shard_count: long;
    doc_count: long;
    total_size_bytes: long;
    primary_size_bytes: long;
    primary_shard_size_avg_bytes: long;
    primary_shard_size_median_bytes: long;
    primary_shard_size_mad_bytes: long;
}
export interface XpackUsageDataTiers extends XpackUsageBase {
    data_warm: XpackUsageDataTierPhaseStatistics;
    data_frozen?: XpackUsageDataTierPhaseStatistics;
    data_cold: XpackUsageDataTierPhaseStatistics;
    data_content: XpackUsageDataTierPhaseStatistics;
    data_hot: XpackUsageDataTierPhaseStatistics;
}
export interface XpackUsageDatafeed {
    count: long;
}
export interface XpackUsageEql extends XpackUsageBase {
    features: XpackUsageEqlFeatures;
    queries: Record<string, XpackUsageQuery>;
}
export interface XpackUsageEqlFeatures {
    join: uint;
    joins: XpackUsageEqlFeaturesJoin;
    keys: XpackUsageEqlFeaturesKeys;
    event: uint;
    pipes: XpackUsageEqlFeaturesPipes;
    sequence: uint;
    sequences: XpackUsageEqlFeaturesSequences;
}
export interface XpackUsageEqlFeaturesJoin {
    join_queries_two: uint;
    join_queries_three: uint;
    join_until: uint;
    join_queries_five_or_more: uint;
    join_queries_four: uint;
}
export interface XpackUsageEqlFeaturesKeys {
    join_keys_two: uint;
    join_keys_one: uint;
    join_keys_three: uint;
    join_keys_five_or_more: uint;
    join_keys_four: uint;
}
export interface XpackUsageEqlFeaturesPipes {
    pipe_tail: uint;
    pipe_head: uint;
}
export interface XpackUsageEqlFeaturesSequences {
    sequence_queries_three: uint;
    sequence_queries_four: uint;
    sequence_queries_two: uint;
    sequence_until: uint;
    sequence_queries_five_or_more: uint;
    sequence_maxspan: uint;
}
export interface XpackUsageFeatureToggle {
    enabled: boolean;
}
export interface XpackUsageFlattened extends XpackUsageBase {
    field_count: integer;
}
export interface XpackUsageFrozenIndices extends XpackUsageBase {
    indices_count: long;
}
export interface XpackUsageHealthStatistics extends XpackUsageBase {
    invocations: XpackUsageInvocations;
}
export interface XpackUsageIlm {
    policy_count: integer;
    policy_stats: XpackUsageIlmPolicyStatistics[];
}
export interface XpackUsageIlmPolicyStatistics {
    indices_managed: integer;
    phases: IlmPhases;
}
export interface XpackUsageInvocations {
    total: long;
}
export interface XpackUsageIpFilter {
    http: boolean;
    transport: boolean;
}
export interface XpackUsageJobUsage {
    count: integer;
    created_by: Record<string, long>;
    detectors: MlJobStatistics;
    forecasts: XpackUsageMlJobForecasts;
    model_size: MlJobStatistics;
}
export interface XpackUsageMachineLearning extends XpackUsageBase {
    datafeeds: Record<string, XpackUsageDatafeed>;
    jobs: Record<string, XpackUsageJobUsage>;
    node_count: integer;
    data_frame_analytics_jobs: XpackUsageMlDataFrameAnalyticsJobs;
    inference: XpackUsageMlInference;
}
export interface XpackUsageMlCounter {
    count: long;
}
export interface XpackUsageMlDataFrameAnalyticsJobs {
    memory_usage?: XpackUsageMlDataFrameAnalyticsJobsMemory;
    _all: XpackUsageMlDataFrameAnalyticsJobsCount;
    analysis_counts?: XpackUsageMlDataFrameAnalyticsJobsAnalysis;
    stopped?: XpackUsageMlDataFrameAnalyticsJobsCount;
}
export interface XpackUsageMlDataFrameAnalyticsJobsAnalysis {
    classification?: integer;
    outlier_detection?: integer;
    regression?: integer;
}
export interface XpackUsageMlDataFrameAnalyticsJobsCount {
    count: long;
}
export interface XpackUsageMlDataFrameAnalyticsJobsMemory {
    peak_usage_bytes: MlJobStatistics;
}
export interface XpackUsageMlInference {
    ingest_processors: Record<string, XpackUsageMlInferenceIngestProcessor>;
    trained_models: XpackUsageMlInferenceTrainedModels;
    deployments?: XpackUsageMlInferenceDeployments;
}
export interface XpackUsageMlInferenceDeployments {
    count: integer;
    inference_counts: MlJobStatistics;
    model_sizes_bytes: MlJobStatistics;
    time_ms: XpackUsageMlInferenceDeploymentsTimeMs;
}
export interface XpackUsageMlInferenceDeploymentsTimeMs {
    avg: double;
}
export interface XpackUsageMlInferenceIngestProcessor {
    num_docs_processed: XpackUsageMlInferenceIngestProcessorCount;
    pipelines: XpackUsageMlCounter;
    num_failures: XpackUsageMlInferenceIngestProcessorCount;
    time_ms: XpackUsageMlInferenceIngestProcessorCount;
}
export interface XpackUsageMlInferenceIngestProcessorCount {
    max: long;
    sum: long;
    min: long;
}
export interface XpackUsageMlInferenceTrainedModels {
    estimated_operations?: MlJobStatistics;
    estimated_heap_memory_usage_bytes?: MlJobStatistics;
    count?: XpackUsageMlInferenceTrainedModelsCount;
    _all: XpackUsageMlCounter;
    model_size_bytes?: MlJobStatistics;
}
export interface XpackUsageMlInferenceTrainedModelsCount {
    total: long;
    prepackaged: long;
    other: long;
    pass_through?: long;
    regression?: long;
    classification?: long;
    ner?: long;
    text_embedding?: long;
}
export interface XpackUsageMlJobForecasts {
    total: long;
    forecasted_jobs: long;
}
export interface XpackUsageMonitoring extends XpackUsageBase {
    collection_enabled: boolean;
    enabled_exporters: Record<string, long>;
}
export interface XpackUsageQuery {
    count?: integer;
    failed?: integer;
    paging?: integer;
    total?: integer;
}
export interface XpackUsageRealm extends XpackUsageBase {
    name?: string[];
    order?: long[];
    size?: long[];
    cache?: XpackUsageRealmCache[];
    has_authorization_realms?: boolean[];
    has_default_username_pattern?: boolean[];
    has_truststore?: boolean[];
    is_authentication_delegated?: boolean[];
}
export interface XpackUsageRealmCache {
    size: long;
}
export interface XpackUsageRequest extends RequestBase {

}
export interface XpackUsageResponse {
    aggregate_metric: XpackUsageBase;
    analytics: XpackUsageAnalytics;
    archive: XpackUsageArchive;
    watcher: XpackUsageWatcher;
    ccr: XpackUsageCcr;
    data_frame?: XpackUsageBase;
    data_science?: XpackUsageBase;
    data_streams?: XpackUsageDataStreams;
    data_tiers: XpackUsageDataTiers;
    enrich?: XpackUsageBase;
    eql: XpackUsageEql;
    flattened?: XpackUsageFlattened;
    frozen_indices: XpackUsageFrozenIndices;
    graph: XpackUsageBase;
    health_api?: XpackUsageHealthStatistics;
    ilm: XpackUsageIlm;
    logstash: XpackUsageBase;
    ml: XpackUsageMachineLearning;
    monitoring: XpackUsageMonitoring;
    rollup: XpackUsageBase;
    runtime_fields?: XpackUsageRuntimeFieldTypes;
    spatial: XpackUsageBase;
    searchable_snapshots: XpackUsageSearchableSnapshots;
    security: XpackUsageSecurity;
    slm: XpackUsageSlm;
    sql: XpackUsageSql;
    transform: XpackUsageBase;
    vectors?: XpackUsageVector;
    voting_only: XpackUsageBase;
}
export interface XpackUsageRoleMapping {
    enabled: integer;
    size: integer;
}
export interface XpackUsageRuntimeFieldTypes extends XpackUsageBase {
    field_types: XpackUsageRuntimeFieldsType[];
}
export interface XpackUsageRuntimeFieldsType {
    chars_max: long;
    chars_total: long;
    count: long;
    doc_max: long;
    doc_total: long;
    index_count: long;
    lang: string[];
    lines_max: long;
    lines_total: long;
    name: Field;
    scriptless_count: long;
    shadowed_count: long;
    source_max: long;
    source_total: long;
}
export interface XpackUsageSearchableSnapshots extends XpackUsageBase {
    indices_count: integer;
    full_copy_indices_count?: integer;
    shared_cache_indices_count?: integer;
}
export interface XpackUsageSecurity extends XpackUsageBase {
    api_key_service: XpackUsageFeatureToggle;
    anonymous: XpackUsageFeatureToggle;
    audit: XpackUsageAudit;
    fips_140: XpackUsageFeatureToggle;
    ipfilter: XpackUsageIpFilter;
    realms: Record<string, XpackUsageRealm>;
    role_mapping: Record<string, XpackUsageRoleMapping>;
    roles: XpackUsageSecurityRoles;
    ssl: XpackUsageSsl;
    system_key?: XpackUsageFeatureToggle;
    token_service: XpackUsageFeatureToggle;
    operator_privileges: XpackUsageBase;
}
export interface XpackUsageSecurityRoles {
    native: XpackUsageSecurityRolesNative;
    dls: XpackUsageSecurityRolesDls;
    file: XpackUsageSecurityRolesFile;
}
export interface XpackUsageSecurityRolesDls {
    bit_set_cache: XpackUsageSecurityRolesDlsBitSetCache;
}
export interface XpackUsageSecurityRolesDlsBitSetCache {
    count: integer;
    memory?: ByteSize;
    memory_in_bytes: ulong;
}
export interface XpackUsageSecurityRolesFile {
    dls: boolean;
    fls: boolean;
    size: long;
}
export interface XpackUsageSecurityRolesNative {
    dls: boolean;
    fls: boolean;
    size: long;
}
export interface XpackUsageSlm extends XpackUsageBase {
    policy_count?: integer;
    policy_stats?: SlmStatistics;
}
export interface XpackUsageSql extends XpackUsageBase {
    features: Record<string, integer>;
    queries: Record<string, XpackUsageQuery>;
}
export interface XpackUsageSsl {
    http: XpackUsageFeatureToggle;
    transport: XpackUsageFeatureToggle;
}
export interface XpackUsageVector extends XpackUsageBase {
    dense_vector_dims_avg_count: integer;
    dense_vector_fields_count: integer;
    sparse_vector_fields_count?: integer;
}
export interface XpackUsageWatcher extends XpackUsageBase {
    execution: XpackUsageWatcherActions;
    watch: XpackUsageWatcherWatch;
    count: XpackUsageCounter;
}
export interface XpackUsageWatcherActionTotals {
    total: Duration;
    total_time_in_ms: DurationValue<UnitMillis>;
}
export interface XpackUsageWatcherActions {
    actions: Record<Name, XpackUsageWatcherActionTotals>;
}
export interface XpackUsageWatcherWatch {
    input: Record<Name, XpackUsageCounter>;
    condition?: Record<Name, XpackUsageCounter>;
    action?: Record<Name, XpackUsageCounter>;
    trigger: XpackUsageWatcherWatchTrigger;
}
export interface XpackUsageWatcherWatchTrigger {
    schedule?: XpackUsageWatcherWatchTriggerSchedule;
    _all: XpackUsageCounter;
}
export interface XpackUsageWatcherWatchTriggerSchedule extends XpackUsageCounter {
    cron: XpackUsageCounter;
    _all: XpackUsageCounter;
}
export interface SpecUtilsAdditionalProperties<TKey = unknown, TValue = unknown> {
}
export interface SpecUtilsAdditionalProperty<TKey = unknown, TValue = unknown> {
}
export interface SpecUtilsCommonQueryParameters {
    error_trace?: boolean;
    filter_path?: string | string[];
    human?: boolean;
    pretty?: boolean;
}
export interface SpecUtilsCommonCatQueryParameters {
    format?: string;
    h?: Names;
    help?: boolean;
    local?: boolean;

    s?: Names;
    v?: boolean;
}
export interface SpecUtilsOverloadOf<TDefinition = unknown> {
}
