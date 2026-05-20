import type { FilesClient } from '../../../common/files_client';
import type { FileKind } from '../../../common/types';
import type { CreateHandler, FileKindRouter } from './types';
import type { CreateRouteDefinition } from '../api_routes';
export declare const method: "get";
declare const rt: {
    params: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        fileName: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, any, FilesClient['download']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
