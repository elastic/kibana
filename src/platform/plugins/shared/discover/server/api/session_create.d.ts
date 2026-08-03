import type { RequestHandlerContext } from '@kbn/core/server';
import type { DiscoverSessionApiData, DiscoverSessionApiResponse } from './schema';
export declare const createDiscoverSession: (requestContext: RequestHandlerContext, data: DiscoverSessionApiData) => Promise<DiscoverSessionApiResponse>;
