import { FilterStateStore } from '@kbn/es-query-constants';
export declare const filterStateStoreSchema: import("@kbn/config-schema").Type<FilterStateStore>;
export declare const storedFilterMetaSchema: import("@kbn/config-schema").ObjectType<{
    alias: import("@kbn/config-schema").Type<string | null | undefined>;
    disabled: import("@kbn/config-schema").Type<boolean | undefined>;
    negate: import("@kbn/config-schema").Type<boolean | undefined>;
    controlledBy: import("@kbn/config-schema").Type<string | undefined>;
    group: import("@kbn/config-schema").Type<string | undefined>;
    relation: import("@kbn/config-schema").Type<string | undefined>;
    field: import("@kbn/config-schema").Type<string | undefined>;
    index: import("@kbn/config-schema").Type<string | undefined>;
    isMultiIndex: import("@kbn/config-schema").Type<boolean | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    key: import("@kbn/config-schema").Type<string | undefined>;
    params: import("@kbn/config-schema").Type<any>;
    value: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const storedFilterSchema: import("@kbn/config-schema").ObjectType<{
    meta: import("@kbn/config-schema").ObjectType<{
        alias: import("@kbn/config-schema").Type<string | null | undefined>;
        disabled: import("@kbn/config-schema").Type<boolean | undefined>;
        negate: import("@kbn/config-schema").Type<boolean | undefined>;
        controlledBy: import("@kbn/config-schema").Type<string | undefined>;
        group: import("@kbn/config-schema").Type<string | undefined>;
        relation: import("@kbn/config-schema").Type<string | undefined>;
        field: import("@kbn/config-schema").Type<string | undefined>;
        index: import("@kbn/config-schema").Type<string | undefined>;
        isMultiIndex: import("@kbn/config-schema").Type<boolean | undefined>;
        type: import("@kbn/config-schema").Type<string | undefined>;
        key: import("@kbn/config-schema").Type<string | undefined>;
        params: import("@kbn/config-schema").Type<any>;
        value: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    query: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    $state: import("@kbn/config-schema").Type<Readonly<{} & {
        store: FilterStateStore;
    }> | undefined>;
}>;
