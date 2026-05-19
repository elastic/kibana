export declare const sectionGridDataSchema: import("@kbn/config-schema").ObjectType<{
    y: import("@kbn/config-schema").Type<number>;
    i: import("@kbn/config-schema").Type<string>;
}>;
export declare const gridDataSchema: import("@kbn/config-schema").ObjectType<Omit<{
    y: import("@kbn/config-schema").Type<number>;
    i: import("@kbn/config-schema").Type<string>;
}, "w" | "h" | "x" | "sectionId"> & {
    w: import("@kbn/config-schema").Type<number>;
    h: import("@kbn/config-schema").Type<number>;
    x: import("@kbn/config-schema").Type<number>;
    sectionId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const sectionSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    collapsed: import("@kbn/config-schema").Type<boolean | undefined>;
    gridData: import("@kbn/config-schema").ObjectType<{
        y: import("@kbn/config-schema").Type<number>;
        i: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const dashboardAttributesSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
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
}, "sections"> & {
    sections: import("@kbn/config-schema").Type<Readonly<{
        collapsed?: boolean | undefined;
    } & {
        title: string;
        gridData: Readonly<{} & {
            y: number;
            i: string;
        }>;
    }>[] | undefined>;
}>;
