import type { RequestHandlerContext } from '@kbn/core/server';
export declare const deleteDiscoverSession: (requestContext: RequestHandlerContext, id: string) => Promise<{
    id: string;
    data: {
        title: string;
    };
}>;
