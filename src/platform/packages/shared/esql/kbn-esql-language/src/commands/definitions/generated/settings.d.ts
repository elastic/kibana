export declare enum EsqlSettingNames {
    APPROXIMATION = "approximation",
    COLUMN_METADATA = "column_metadata",
    PROJECT_ROUTING = "project_routing",
    TIME_ZONE = "time_zone",
    UNMAPPED_FIELDS = "unmapped_fields",
    WILDCARDS_MATCH_DATASETS = "wildcards_match_datasets"
}
export declare const settings: {
    name: EsqlSettingNames;
    type: string[];
    description: string;
    serverlessOnly: boolean;
    preview: boolean;
    snapshotOnly: boolean;
    ignoreAsSuggestion: boolean;
}[];
