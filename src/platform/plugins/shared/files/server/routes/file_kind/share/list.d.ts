import type { FilesClient } from '../../../../common/files_client';
import type { CreateRouteDefinition } from '../../api_routes';
import type { FileKind, FileShareJSON } from '../../../../common/types';
import type { CreateHandler, FileKindRouter } from '../types';
export declare const method: "get";
declare const rt: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
        forFileId: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, {
    shares: FileShareJSON[];
}, FilesClient['listShares']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
