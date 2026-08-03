import { type RequestHandlerContext } from '@kbn/core/server';
import type { DiscoverSessionApiResponse } from './schema';
export declare const getDiscoverSession: (requestContext: RequestHandlerContext, id: string) => Promise<DiscoverSessionApiResponse>;
