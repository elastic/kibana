import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
export declare function writeErrorHandler(error: any, response: KibanaResponseFactory, logger: Logger, req: KibanaRequest): IKibanaResponse;
