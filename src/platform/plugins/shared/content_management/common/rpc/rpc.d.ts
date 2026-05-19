export declare const schemas: {
    get: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            id: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            result: import("@kbn/config-schema").ObjectType<{
                item: import("@kbn/config-schema").ObjectType<{}>;
                meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
            }>;
        }>;
    };
    bulkGet: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            ids: import("@kbn/config-schema").Type<string[]>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            hits: import("@kbn/config-schema").Type<Readonly<{} & {
                result: Readonly<{
                    meta?: Readonly<{} & {}> | undefined;
                } & {
                    item: Readonly<{} & {}>;
                }>;
                contentTypeId: string;
            }>[]>;
            meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
    };
    create: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            data: import("@kbn/config-schema").Type<Record<string, any>>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            result: import("@kbn/config-schema").ObjectType<{
                item: import("@kbn/config-schema").ObjectType<{}>;
                meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
            }>;
        }>;
    };
    update: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            id: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            data: import("@kbn/config-schema").Type<Record<string, any>>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            result: import("@kbn/config-schema").ObjectType<{
                item: import("@kbn/config-schema").ObjectType<{}>;
                meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
            }>;
        }>;
    };
    delete: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            id: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            result: import("@kbn/config-schema").ObjectType<{
                success: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>;
    };
    search: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            version: import("@kbn/config-schema").Type<number>;
            query: import("@kbn/config-schema").Type<Readonly<{
                tags?: Readonly<{
                    excluded?: string[] | undefined;
                    included?: string[] | undefined;
                } & {}> | undefined;
                text?: string | undefined;
                cursor?: string | undefined;
                limit?: number | undefined;
            } & {}>>;
            options: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypeId: import("@kbn/config-schema").Type<string>;
            result: import("@kbn/config-schema").ObjectType<{
                hits: import("@kbn/config-schema").Type<any[]>;
                pagination: import("@kbn/config-schema").ObjectType<{
                    total: import("@kbn/config-schema").Type<number>;
                    cursor: import("@kbn/config-schema").Type<string | undefined>;
                }>;
            }>;
            meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        }>;
    };
    mSearch: {
        in: import("@kbn/config-schema").ObjectType<{
            contentTypes: import("@kbn/config-schema").Type<Readonly<{} & {
                version: number;
                contentTypeId: string;
            }>[]>;
            query: import("@kbn/config-schema").Type<Readonly<{
                tags?: Readonly<{
                    excluded?: string[] | undefined;
                    included?: string[] | undefined;
                } & {}> | undefined;
                text?: string | undefined;
                cursor?: string | undefined;
                limit?: number | undefined;
            } & {}>>;
        }>;
        out: import("@kbn/config-schema").ObjectType<{
            contentTypes: import("@kbn/config-schema").Type<Readonly<{} & {
                version: number;
                contentTypeId: string;
            }>[]>;
            result: import("@kbn/config-schema").ObjectType<{
                hits: import("@kbn/config-schema").Type<any[]>;
                pagination: import("@kbn/config-schema").ObjectType<{
                    total: import("@kbn/config-schema").Type<number>;
                    cursor: import("@kbn/config-schema").Type<string | undefined>;
                }>;
            }>;
        }>;
    };
};
