import type { Version } from '@kbn/object-versioning';
import type { ItemResult } from './types';
export declare const getResultSchema: import("@kbn/config-schema").ObjectType<{
    contentTypeId: import("@kbn/config-schema").Type<string>;
    result: import("@kbn/config-schema").ObjectType<{
        item: import("@kbn/config-schema").ObjectType<{}>;
        meta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    }>;
}>;
export declare const getSchemas: {
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
export interface GetIn<T extends string = string, Options extends void | object = object> {
    id: string;
    contentTypeId: T;
    version?: Version;
    options?: Options;
}
export type GetResult<T = unknown, M = void> = ItemResult<T, M>;
