import type { Version } from '@kbn/object-versioning';
import type { SearchQuery, SearchResult } from './search';
export declare const mSearchSchemas: {
    in: import("@kbn/config-schema").ObjectType<{
        contentTypes: import("@kbn/config-schema").Type<Readonly<{} & {
            version: number;
            contentTypeId: string;
        }>[]>;
        query: import("@kbn/config-schema").Type<Readonly<{
            text?: string | undefined;
            tags?: Readonly<{
                included?: string[] | undefined;
                excluded?: string[] | undefined;
            } & {}> | undefined;
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
export type MSearchQuery = SearchQuery;
export interface MSearchIn {
    contentTypes: Array<{
        contentTypeId: string;
        version?: Version;
    }>;
    query: MSearchQuery;
}
export type MSearchResult<T = unknown> = SearchResult<T>;
export interface MSearchOut<T = unknown> {
    contentTypes: Array<{
        contentTypeId: string;
        version?: Version;
    }>;
    result: MSearchResult<T>;
}
