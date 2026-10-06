/**
 * Derives a low-cardinality page-load transaction name from a URL pathname.
 *
 * - App routes resolve to `/app/{appId}`, regardless of deeper path segments or
 *   any server/space base-path prefix (the match is not anchored, so a leading
 *   `/s/{space}` or `server.basePath` prefix is ignored). This mirrors the
 *   client-side name set in `ApmSystem.closePageLoadTransaction` (`/app/{appId}`),
 *   keeping the server seed and the client rename consistent.
 * - Non-app routes (e.g. `/login`) keep their pathname as-is; the prefix is a
 *   fixed per-deployment constant, so their cardinality is already bounded.
 */
export declare const getPageLoadTransactionName: (pathname: string) => string;
