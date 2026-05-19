import type { Type } from '@kbn/config-schema';
import type { FilesClient } from '../../../common/files_client';
import type { FileKind } from '../../../common/types';
import type { CreateRouteDefinition } from '../../../common/api_routes';
import type { FileKindRouter } from './types';
import type { CreateHandler } from './types';
export declare const method: "put";
declare const rt: {
    params: import("@kbn/config-schema").ObjectType<{
        id: Type<string>;
    }>;
    body: Type<unknown>;
    query: import("@kbn/config-schema").ObjectType<{
        selfDestructOnAbort: Type<boolean | undefined>;
    }>;
};
export type Endpoint = CreateRouteDefinition<typeof rt, {
    ok: true;
    size: number;
}, FilesClient['upload']>;
export declare const handler: CreateHandler<Endpoint>;
export declare function register(fileKindRouter: FileKindRouter, fileKind: FileKind): void;
export {};
