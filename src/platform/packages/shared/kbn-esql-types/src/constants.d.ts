export declare const REGISTRY_EXTENSIONS_ROUTE = "/internal/esql_registry/extensions/";
export declare const SOURCES_AUTOCOMPLETE_ROUTE = "/internal/esql/autocomplete/sources/";
export declare const TIMEFIELD_ROUTE = "/internal/esql/get_timefield";
export declare const VIEWS_ROUTE = "/internal/esql/views";
export declare const DATASETS_ROUTE = "/internal/esql/datasets";
export declare const NL_TO_ESQL_ROUTE = "/internal/esql/nl_to_esql";
export declare const SUGGEST_FIX_ROUTE = "/internal/esql/suggest_fix";
export declare const FIX_WITH_AI_COMMAND_ID = "esql.fixWithAI";
export declare const LOOKUP_INDEX_CREATE_ROUTE = "/internal/esql/lookup_index/create";
export declare const LOOKUP_INDEX_UPDATE_ROUTE = "/internal/esql/lookup_index/update";
export declare const LOOKUP_INDEX_RECREATE_ROUTE = "/internal/esql/lookup_index/recreate";
export declare const LOOKUP_INDEX_PRIVILEGES_ROUTE = "/internal/esql/lookup_index/privileges";
export declare const LOOKUP_INDEX_UPDATE_MAPPINGS_ROUTE = "/internal/esql/lookup_index/update_mappings";
export declare enum SOURCES_TYPES {
    INDEX = "Index",
    TIMESERIES = "Timeseries",
    INTEGRATION = "Integration",
    ALIAS = "Alias",
    DATA_STREAM = "Data Stream",
    LOOKUP = "Lookup",
    WIRED_STREAM = "Wired Stream",
    CLASSIC_STREAM = "Classic Stream",
    QUERY_STREAM = "Query Stream"
}
