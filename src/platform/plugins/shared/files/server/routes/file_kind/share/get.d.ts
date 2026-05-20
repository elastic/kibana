import type { FilesClient } from '../../../../common/files_client';
import type { CreateRouteDefinition } from '../../api_routes';
import type { FileKind, FileShareJSON } from '../../../../common/types';
import type { CreateHandler, FileKindRouter } from '../types';
export declare const method: "get";
declare const rt: {
    params: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, {
    share: FileShareJSON;
}, FilesClient['getShare']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
