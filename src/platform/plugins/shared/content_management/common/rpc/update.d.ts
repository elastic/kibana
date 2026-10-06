import type { Version } from '@kbn/object-versioning';
import type { ItemResult } from './types';
export declare const updateSchemas: {
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
export interface UpdateIn<T extends string = string, Data extends object = object, Options extends void | object = object> {
    contentTypeId: T;
    id: string;
    data: Data;
    version?: Version;
    options?: Options;
}
export type UpdateResult<T = unknown, M = void> = ItemResult<T, M>;
