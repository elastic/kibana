import type { ObjectType } from '@kbn/config-schema';
export declare const apiError: ObjectType<{
    error: import("@kbn/config-schema").Type<string>;
    message: import("@kbn/config-schema").Type<string>;
    statusCode: import("@kbn/config-schema").Type<number>;
    metadata: ObjectType<{}>;
}>;
export declare const referenceSchema: ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<string>;
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const referencesSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    name: string;
    id: string;
    type: string;
}>[]>;
export declare const savedObjectSchema: <T extends ObjectType<any>>(attributesSchema: T) => ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    createdAt: import("@kbn/config-schema").Type<string | undefined>;
    updatedAt: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | undefined>;
    updatedBy: import("@kbn/config-schema").Type<string | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        metadata: Readonly<{} & {}>;
        error: string;
        message: string;
        statusCode: number;
    }> | undefined>;
    attributes: T;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[]>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    originId: import("@kbn/config-schema").Type<string | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const objectTypeToGetResultSchema: <T extends ObjectType<any>>(soSchema: T) => ObjectType<{
    item: T;
    meta: ObjectType<{
        outcome: import("@kbn/config-schema").Type<"conflict" | "exactMatch" | "aliasMatch">;
        aliasTargetId: import("@kbn/config-schema").Type<string | undefined>;
        aliasPurpose: import("@kbn/config-schema").Type<"savedObjectConversion" | "savedObjectImport" | undefined>;
    }>;
}>;
export declare const createOptionsSchemas: {
    id: import("@kbn/config-schema").Type<string | undefined>;
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
    overwrite: import("@kbn/config-schema").Type<boolean | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    refresh: import("@kbn/config-schema").Type<boolean | undefined>;
    initialNamespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    managed: import("@kbn/config-schema").Type<boolean | undefined>;
};
export declare const schemaAndOr: import("@kbn/config-schema").Type<"AND" | "OR">;
export declare const searchOptionsSchemas: {
    page: import("@kbn/config-schema").Type<number | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    rootSearchFields: import("@kbn/config-schema").Type<string[] | undefined>;
    hasReference: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }> | Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
    hasReferenceOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    hasNoReference: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }> | Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
    hasNoReferenceOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    defaultSearchOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
    pit: import("@kbn/config-schema").Type<Readonly<{
        keepAlive?: string | undefined;
    } & {
        id: string;
    }> | undefined>;
};
export declare const updateOptionsSchema: {
    references: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    refresh: import("@kbn/config-schema").Type<boolean | "wait_for" | undefined>;
    upsert: <T extends ObjectType<any>>(attributesSchema: T) => import("@kbn/config-schema").Type<Readonly<{ [K in keyof ("error" | "version" | "namespaces" | "originId" | "managed" | "createdBy" | "updatedAt" | "createdAt" | "updatedBy" | (undefined extends import("@kbn/config-schema").TypeOf<T> ? "attributes" : never) extends infer T_1 extends keyof {
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    } ? { [P in T_1]: {
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }[P]; } : never)]?: import("@kbn/config-schema").TypeOf<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }[K]> | undefined; } & { [K_1 in keyof ("id" | "type" | "references" | (undefined extends import("@kbn/config-schema").TypeOf<T> ? never : "attributes") extends infer T_2 extends keyof {
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    } ? { [P_1 in T_2]: {
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }[P_1]; } : never)]: import("@kbn/config-schema").TypeOf<{
        id: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        createdAt: import("@kbn/config-schema").Type<string | undefined>;
        updatedAt: import("@kbn/config-schema").Type<string | undefined>;
        createdBy: import("@kbn/config-schema").Type<string | undefined>;
        updatedBy: import("@kbn/config-schema").Type<string | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            metadata: Readonly<{} & {}>;
            error: string;
            message: string;
            statusCode: number;
        }> | undefined>;
        attributes: T;
        references: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[]>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        originId: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
    }[K_1]>; }> | undefined>;
    retryOnConflict: import("@kbn/config-schema").Type<number | undefined>;
    mergeAttributes: import("@kbn/config-schema").Type<boolean | undefined>;
};
export declare const createResultSchema: <T extends ObjectType<any>>(soSchema: T) => ObjectType<{
    item: T;
}>;
export declare const searchResultSchema: <T extends ObjectType<any>, M extends ObjectType<any> = never>(soSchema: T, meta?: M) => ObjectType<{
    meta?: M | undefined;
    hits: import("@kbn/config-schema").Type<Readonly<{
        [x: string]: any;
    } & {}>[]>;
    pagination: ObjectType<{
        total: import("@kbn/config-schema").Type<number>;
        cursor: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
