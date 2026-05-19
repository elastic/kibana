import type { FileJSON, FileKind } from '../../../common/types';
import type { FilesClient } from '../../../common/files_client';
import type { CreateRouteDefinition } from '../api_routes';
import type { CreateHandler, FileKindRouter } from './types';
export declare const method: "get";
declare const rt: {
    params: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
    }>;
};
export type Endpoint<M = unknown> = CreateRouteDefinition<typeof rt, {
    file: FileJSON<M>;
}, FilesClient['getById']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
