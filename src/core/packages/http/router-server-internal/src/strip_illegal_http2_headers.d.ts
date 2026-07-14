import type { Logger } from '@kbn/logging';
import type { ResponseHeaders } from '@kbn/core-http-server';
/**
 * Return a new version of the provided headers, with all illegal http2 headers removed.
 * If `isDev` is `true`, will also log a warning if such header is encountered.
 */
export declare const stripIllegalHttp2Headers: ({ headers, isDev, logger, requestContext, }: {
    headers: ResponseHeaders;
    isDev: boolean;
    logger: Logger;
    requestContext: string;
}) => ResponseHeaders;
