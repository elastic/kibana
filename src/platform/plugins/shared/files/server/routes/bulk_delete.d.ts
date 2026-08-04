import type { FilesClient } from '../../common/files_client';
import type { FilesRouter } from './types';
import type { CreateRouteDefinition } from './api_routes';
declare const rt: {
    body: import("@kbn/config-schema").ObjectType<{
        ids: import("@kbn/config-schema").Type<string[]>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, {
    /**
     * The files that were deleted
     */
    succeeded: string[];
    /**
     * Any failed deletions. Only included in the response if there were failures.
     */
    failed?: Array<[id: string, reason: string]>;
}, FilesClient['bulkDelete']>;
export declare function register(router: FilesRouter): void;
export {};
