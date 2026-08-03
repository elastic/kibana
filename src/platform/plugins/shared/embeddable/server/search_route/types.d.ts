import { type TypeOf } from '@kbn/config-schema';
export declare const searchLibraryRequestSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<string | string[]>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    limit: import("@kbn/config-schema").Type<number | undefined>;
    tags: import("@kbn/config-schema").Type<Readonly<{
        included?: string[] | undefined;
        excluded?: string[] | undefined;
    } & {}> | undefined>;
}>;
export type SearchLibraryRequestType = TypeOf<typeof searchLibraryRequestSchema>;
export declare const searchLibraryResponseSchema: import("@kbn/config-schema").ObjectType<{
    hits: import("@kbn/config-schema").Type<any[]>;
    total: import("@kbn/config-schema").Type<number>;
}>;
export type SearchLibraryResponseType = TypeOf<typeof searchLibraryResponseSchema>;
