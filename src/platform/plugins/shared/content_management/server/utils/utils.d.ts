import type { Type, ValidationError } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ContentRegistry, StorageContext } from '../core';
import type { GetTransformsFactoryFn } from '../types';
export declare const validate: (input: unknown, schema: Type<any>) => ValidationError | null;
export declare const getStorageContext: ({ request, contentTypeId, version: _version, ctx: { contentRegistry, requestHandlerContext, getTransformsFactory }, }: {
    request: KibanaRequest;
    contentTypeId: string;
    version?: number;
    ctx: {
        contentRegistry: ContentRegistry;
        requestHandlerContext: RequestHandlerContext;
        getTransformsFactory: GetTransformsFactoryFn;
    };
}) => StorageContext;
