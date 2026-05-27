import type { Version } from '@kbn/object-versioning';
export declare const deleteSchemas: {
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
export interface DeleteIn<T extends string = string, Options extends void | object = object> {
    contentTypeId: T;
    id: string;
    version?: Version;
    options?: Options;
}
export interface DeleteResult {
    success: boolean;
}
