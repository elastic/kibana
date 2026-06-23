export declare enum EsqlSettingNames {
    APPROXIMATION = "approximation",
    PROJECT_ROUTING = "project_routing",
    TIME_ZONE = "time_zone",
    UNMAPPED_FIELDS = "unmapped_fields"
}
export declare const settings: {
    name: EsqlSettingNames;
    type: string[];
    serverlessOnly: boolean;
    preview: boolean;
    snapshotOnly: boolean;
    description: string;
    ignoreAsSuggestion: boolean;
}[];
