import type { FilesClient } from '../../../common/files_client';
import type { FileJSON, FileKind } from '../../../common/types';
import type { CreateRouteDefinition } from '../api_routes';
import type { FileKindRouter } from './types';
export declare const method: "post";
export declare const rt: {
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        alt: import("@kbn/config-schema").Type<string | undefined>;
        meta: import("@kbn/config-schema").Type<unknown>;
        mimeType: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export type Endpoint<M = unknown> = CreateRouteDefinition<typeof rt, {
    file: FileJSON<M>;
}, FilesClient['create']>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
