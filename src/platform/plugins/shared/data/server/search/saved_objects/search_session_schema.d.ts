export declare const SCHEMA_SEARCH_SESSION_V8_8_O: import("@kbn/config-schema").ObjectType<{
    sessionId: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    created: import("@kbn/config-schema").Type<string>;
    expires: import("@kbn/config-schema").Type<string>;
    appId: import("@kbn/config-schema").Type<string | undefined>;
    locatorId: import("@kbn/config-schema").Type<string | undefined>;
    initialState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    restoreState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    idMapping: import("@kbn/config-schema").Type<Map<string, Readonly<{} & {
        id: string;
        strategy: string;
    }>>>;
    realmType: import("@kbn/config-schema").Type<string | undefined>;
    realmName: import("@kbn/config-schema").Type<string | undefined>;
    username: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string>;
    isCanceled: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const SCHEMA_SEARCH_SESSION_V1: import("@kbn/config-schema").ObjectType<{
    sessionId: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    created: import("@kbn/config-schema").Type<string>;
    expires: import("@kbn/config-schema").Type<string>;
    appId: import("@kbn/config-schema").Type<string | undefined>;
    locatorId: import("@kbn/config-schema").Type<string | undefined>;
    initialState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    restoreState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    idMapping: import("@kbn/config-schema").Type<Map<string, Readonly<{} & {
        id: string;
        strategy: string;
    }>>>;
    realmType: import("@kbn/config-schema").Type<string | undefined>;
    realmName: import("@kbn/config-schema").Type<string | undefined>;
    username: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string>;
    isCanceled: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const SCHEMA_SEARCH_SESSION_V2: import("@kbn/config-schema").ObjectType<Omit<{
    sessionId: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    created: import("@kbn/config-schema").Type<string>;
    expires: import("@kbn/config-schema").Type<string>;
    appId: import("@kbn/config-schema").Type<string | undefined>;
    locatorId: import("@kbn/config-schema").Type<string | undefined>;
    initialState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    restoreState: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    idMapping: import("@kbn/config-schema").Type<Map<string, Readonly<{} & {
        id: string;
        strategy: string;
    }>>>;
    realmType: import("@kbn/config-schema").Type<string | undefined>;
    realmName: import("@kbn/config-schema").Type<string | undefined>;
    username: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string>;
    isCanceled: import("@kbn/config-schema").Type<boolean | undefined>;
}, "status" | "idMapping"> & {
    status: import("@kbn/config-schema").Type<string | undefined>;
    idMapping: import("@kbn/config-schema").Type<Map<string, Readonly<{
        error?: Readonly<{
            message?: string | undefined;
        } & {
            code: string;
        }> | undefined;
        status?: string | undefined;
        startedAt?: string | undefined;
        completedAt?: string | undefined;
    } & {
        id: string;
        strategy: string;
    }>>>;
}>;
