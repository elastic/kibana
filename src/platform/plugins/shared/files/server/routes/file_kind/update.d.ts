import type { FileJSON, FileKind } from '../../../common/types';
import type { FilesClient } from '../../../common/files_client';
import type { CreateHandler, FileKindRouter } from './types';
import type { CreateRouteDefinition } from '../api_routes';
export declare const method: "patch";
declare const rt: {
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        alt: import("@kbn/config-schema").Type<string | undefined>;
        meta: import("@kbn/config-schema").Type<unknown>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
    }>;
};
export type Endpoint<M = unknown> = CreateRouteDefinition<typeof rt, {
    file: FileJSON<M>;
}, FilesClient['update']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
