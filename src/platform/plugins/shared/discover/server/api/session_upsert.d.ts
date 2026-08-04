import type { RequestHandlerContext } from '@kbn/core/server';
import type { DiscoverSessionApiData, DiscoverSessionApiResponse } from './schema';
export declare const upsertDiscoverSession: (requestContext: RequestHandlerContext, id: string, data: DiscoverSessionApiData) => Promise<{
    body: DiscoverSessionApiResponse;
    operation: "create" | "update";
}>;
