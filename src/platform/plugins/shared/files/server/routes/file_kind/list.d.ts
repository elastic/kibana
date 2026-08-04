import type { FileJSON, FileKind } from '../../../common/types';
import type { FilesClient } from '../../../common/files_client';
import type { CreateRouteDefinition } from '../api_routes';
import type { CreateHandler, FileKindRouter } from './types';
export declare const method: "post";
declare const rt: {
    body: import("@kbn/config-schema").ObjectType<{
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
export type Endpoint<M = unknown> = CreateRouteDefinition<typeof rt, {
    files: Array<FileJSON<M>>;
    total: number;
}, FilesClient['find']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
