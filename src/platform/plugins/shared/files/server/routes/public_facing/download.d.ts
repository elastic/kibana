import type { FilesClient } from '../../../common/files_client';
import type { FilesRouter } from '../types';
import type { CreateRouteDefinition } from '../api_routes';
declare const rt: {
    query: import("@kbn/config-schema").ObjectType<{
        token: import("@kbn/config-schema").Type<string>;
    }>;
    params: import("@kbn/config-schema").ObjectType<{
        fileName: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, any, FilesClient['publicDownload']>;
export declare function register(router: FilesRouter): void;
export {};
