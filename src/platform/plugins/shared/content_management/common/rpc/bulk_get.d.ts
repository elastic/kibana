import type { Version } from '@kbn/object-versioning';
import type { GetResult } from './get';
export declare const bulkGetSchemas: {
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
export interface BulkGetIn<T extends string = string, Options extends void | object = object> {
    contentTypeId: T;
    ids: string[];
    version?: Version;
    options?: Options;
}
export type BulkGetResult<T = unknown, ItemMeta = void, ResultMeta = void> = ResultMeta extends void ? {
    hits: Array<GetResult<T, ItemMeta>>;
} : {
    hits: Array<GetResult<T, ItemMeta>>;
    meta: ResultMeta;
};
