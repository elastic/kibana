import type { RequestHandlerContext } from '@kbn/core/server';
import type { DiscoverSessionSearchParams, DiscoverSessionSearchResponse } from './schema';
export declare const searchDiscoverSessions: (requestContext: RequestHandlerContext, params: DiscoverSessionSearchParams) => Promise<DiscoverSessionSearchResponse>;
