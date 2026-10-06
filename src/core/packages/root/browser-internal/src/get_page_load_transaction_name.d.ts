/**
 * Derives a low-cardinality page-load transaction name from a URL pathname.
 *
 * - App routes resolve to `/app/{appId}` regardless of deeper path segments.
 * - Non-app routes (e.g. `/login`) keep their pathname as-is.
 */
export declare const getPageLoadTransactionName: (pathname: string, basePath?: string) => string;
export declare const isAppPath: (pathname: string, basePath?: string) => boolean;
