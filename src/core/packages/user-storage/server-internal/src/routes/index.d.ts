import type { Logger } from '@kbn/logging';
import type { IRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { UserStorageDefinition } from '@kbn/core-user-storage-common';
interface RegisterRoutesParams {
    router: IRouter<RequestHandlerContext>;
    definitions: ReadonlyMap<string, UserStorageDefinition>;
    logger: Logger;
}
export declare const registerRoutes: ({ router, definitions, logger }: RegisterRoutesParams) => void;
export {};
