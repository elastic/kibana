export declare const searchSessionSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    attributes: import("@kbn/config-schema").ObjectType<{
        sessionId: import("@kbn/config-schema").Type<string>;
        status: import("@kbn/config-schema").Type<string | undefined>;
        name: import("@kbn/config-schema").Type<string | undefined>;
        appId: import("@kbn/config-schema").Type<string | undefined>;
        created: import("@kbn/config-schema").Type<string>;
        expires: import("@kbn/config-schema").Type<string>;
        locatorId: import("@kbn/config-schema").Type<string | undefined>;
        initialState: import("@kbn/config-schema").Type<Map<string, any> | undefined>;
        restoreState: import("@kbn/config-schema").Type<Map<string, any> | undefined>;
        idMapping: import("@kbn/config-schema").Type<Map<string, Readonly<{
            error?: Readonly<{
                message?: string | undefined;
            } & {
                code: number;
            }> | undefined;
            status?: string | undefined;
            startedAt?: string | undefined;
            completedAt?: string | undefined;
        } & {
            id: string;
            strategy: string;
        }>>>;
        realmType: import("@kbn/config-schema").Type<string | undefined>;
        realmName: import("@kbn/config-schema").Type<string | undefined>;
        username: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string>;
        isCanceled: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const searchSessionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<"complete" | "error" | "expired" | "in_progress" | "cancelled">;
    errors: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const searchSessionStatusesSchema: import("@kbn/config-schema").ObjectType<{
    sessions: import("@kbn/config-schema").Type<Record<string, Readonly<{
        name?: string | undefined;
        appId?: string | undefined;
        locatorId?: string | undefined;
        restoreState?: Map<string, any> | undefined;
    } & {}>>>;
    statuses: import("@kbn/config-schema").Type<Record<string, Readonly<{
        errors?: string[] | undefined;
    } & {
        status: "complete" | "error" | "expired" | "in_progress" | "cancelled";
    }>>>;
}>;
export declare const searchSessionsFindSchema: import("@kbn/config-schema").ObjectType<{
    total: import("@kbn/config-schema").Type<number>;
    saved_objects: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        attributes: Readonly<{
            name?: string | undefined;
            status?: string | undefined;
            username?: string | undefined;
            appId?: string | undefined;
            initialState?: Map<string, any> | undefined;
            realmName?: string | undefined;
            locatorId?: string | undefined;
            restoreState?: Map<string, any> | undefined;
            realmType?: string | undefined;
            isCanceled?: boolean | undefined;
        } & {
            version: string;
            expires: string;
            created: string;
            sessionId: string;
            idMapping: Map<string, Readonly<{
                error?: Readonly<{
                    message?: string | undefined;
                } & {
                    code: number;
                }> | undefined;
                status?: string | undefined;
                startedAt?: string | undefined;
                completedAt?: string | undefined;
            } & {
                id: string;
                strategy: string;
            }>>;
        }>;
    }>[]>;
    statuses: import("@kbn/config-schema").Type<Record<string, Readonly<{
        errors?: string[] | undefined;
    } & {
        status: "complete" | "error" | "expired" | "in_progress" | "cancelled";
    }>>>;
}>;
export declare const searchSessionsUpdateSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    updated_by: import("@kbn/config-schema").Type<string | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
    attributes: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        expires: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
