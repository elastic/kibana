import type { FilesClient } from '../../common/files_client';
import type { FileJSON } from '../../common';
import type { CreateRouteDefinition } from './api_routes';
import type { FilesRouter } from './types';
export declare const stringOrArrayOfStrings: import("@kbn/config-schema").Type<string | string[]>;
export declare const nameStringOrArrayOfNameStrings: import("@kbn/config-schema").Type<string | string[]>;
export declare function toArrayOrUndefined(val?: string | string[]): undefined | string[];
declare const rt: {
    body: import("@kbn/config-schema").ObjectType<{
        kind: import("@kbn/config-schema").Type<string | string[] | undefined>;
        kindToExclude: import("@kbn/config-schema").Type<string | string[] | undefined>;
        status: import("@kbn/config-schema").Type<string | string[] | undefined>;
        extension: import("@kbn/config-schema").Type<string | string[] | undefined>;
        mimeType: import("@kbn/config-schema").Type<string | string[] | undefined>;
        name: import("@kbn/config-schema").Type<string | string[] | undefined>;
        meta: import("@kbn/config-schema").Type<unknown>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, {
    files: FileJSON[];
    total: number;
}, FilesClient['find']>;
export declare function register(router: FilesRouter): void;
export {};
