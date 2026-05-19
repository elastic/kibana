export declare const controlGroupInputSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    panelsJSON: import("@kbn/config-schema").Type<string | undefined>;
    controlStyle: import("@kbn/config-schema").Type<string | undefined>;
    chainingSystem: import("@kbn/config-schema").Type<string | undefined>;
    ignoreParentSettingsJSON: import("@kbn/config-schema").Type<string | undefined>;
}, never> & {}, "showApplySelections"> & {
    showApplySelections: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const dashboardAttributesSchema: import("@kbn/config-schema").ObjectType<Omit<{
    title: import("@kbn/config-schema").Type<string>;
    description: import("@kbn/config-schema").Type<string>;
    kibanaSavedObjectMeta: import("@kbn/config-schema").ObjectType<{
        searchSourceJSON: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    timeRestore: import("@kbn/config-schema").Type<boolean | undefined>;
    timeFrom: import("@kbn/config-schema").Type<string | undefined>;
    timeTo: import("@kbn/config-schema").Type<string | undefined>;
    refreshInterval: import("@kbn/config-schema").Type<Readonly<{
        section?: number | undefined;
        display?: string | undefined;
    } & {
        value: number;
        pause: boolean;
    }> | undefined>;
    controlGroupInput: import("@kbn/config-schema").Type<Readonly<{
        panelsJSON?: string | undefined;
        controlStyle?: string | undefined;
        chainingSystem?: string | undefined;
        ignoreParentSettingsJSON?: string | undefined;
    } & {}> | undefined>;
    panelsJSON: import("@kbn/config-schema").Type<string>;
    optionsJSON: import("@kbn/config-schema").Type<string | undefined>;
    hits: import("@kbn/config-schema").Type<number | undefined>;
    version: import("@kbn/config-schema").Type<number | undefined>;
}, "controlGroupInput"> & {
    controlGroupInput: import("@kbn/config-schema").Type<Readonly<{
        panelsJSON?: string | undefined;
        controlStyle?: string | undefined;
        chainingSystem?: string | undefined;
        ignoreParentSettingsJSON?: string | undefined;
        showApplySelections?: boolean | undefined;
    } & {}> | undefined>;
}>;
export declare const gridDataSchema: import("@kbn/config-schema").ObjectType<{
    x: import("@kbn/config-schema").Type<number>;
    y: import("@kbn/config-schema").Type<number>;
    w: import("@kbn/config-schema").Type<number>;
    h: import("@kbn/config-schema").Type<number>;
    i: import("@kbn/config-schema").Type<string>;
}>;
