import type { FilesClient } from '../../../../common/files_client';
import type { CreateHandler, FileKindRouter } from '../types';
import type { CreateRouteDefinition } from '../../api_routes';
import type { FileKind, FileShareJSONWithToken } from '../../../../common/types';
export declare const method: "post";
declare const rt: {
    params: import("@kbn/config-schema").ObjectType<{
        fileId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        validUntil: import("@kbn/config-schema").Type<number | undefined>;
        name: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, FileShareJSONWithToken, FilesClient['share']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
