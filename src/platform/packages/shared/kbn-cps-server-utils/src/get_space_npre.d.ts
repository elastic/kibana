import type { ScopeableUrlRequest } from '@kbn/core-elasticsearch-server';
/**
 * Get the NPRE for a given space ID or a request carrying a URL.
 *
 * When a request object is provided, the space is taken from a URL pathname via
 * {@link getSpaceIdFromPath}. If the request has a `rewrittenUrl` (set by core
 * when the first `onPreRouting` handler returns `rewriteUrl`), that URL is
 * used instead of `url`. This matches HTTP requests after the Spaces plugin
 * strips `/s/:spaceId` from `request.url` during pre-routing: the original
 * browser path (including the space segment) remains on `rewrittenUrl`.
 *
 * **Server base path**: {@link getSpaceIdFromPath} is called with the pathname
 * only; a non-root `server.basePath` is not stripped here. CPS is only
 * available on Serverless, where custom base paths are not used, so this
 * limitation is not a practical concern for CPS.
 *
 * @param spaceIdOrRequest - Space ID string, or a `ScopeableUrlRequest` (incoming
 *   `KibanaRequest` / synthetic `UrlRequest` from `@kbn/core-elasticsearch-server`).
 * @returns The NPRE
 * @throws {Error} if a Request-like object without a `url` is provided.
 *   This is not expected in normal use but guards against JavaScript callers
 *   bypassing the type system.
 */
export declare function getSpaceNPRE(spaceIdOrRequest: string | ScopeableUrlRequest): string;
