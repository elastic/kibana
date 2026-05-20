import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { AnyEndpoint } from '../api_routes';
import type { FilesRequestHandlerContext } from '../types';
export type FileKindRouter = IRouter<FileKindsRequestHandlerContext>;
export interface FileKindsRequestHandlerContext extends FilesRequestHandlerContext {
    fileKind: string;
}
export type FileKindsRequestHandler<P = unknown, Q = unknown, B = unknown> = RequestHandler<P, Q, B, FileKindsRequestHandlerContext>;
export type CreateHandler<E extends AnyEndpoint> = FileKindsRequestHandler<E['inputs']['params'], E['inputs']['query'], E['inputs']['body']>;
