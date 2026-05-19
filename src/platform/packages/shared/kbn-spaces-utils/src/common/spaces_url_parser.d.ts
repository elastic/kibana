/**
 * Extracts the space id from the given path.
 *
 * @param requestBasePath The base path of the current request.
 * @param serverBasePath The server's base path.
 * @returns the space id.
 *
 * @internal
 */
export declare function getSpaceIdFromPath(requestBasePath?: string | null, serverBasePath?: string | null): {
    spaceId: string;
    pathHasExplicitSpaceIdentifier: boolean;
};
/**
 * Given a server base path, space id, and requested resource, this will construct a space-aware path
 * that includes a URL identifier with the space id.
 *
 * @param basePath the server's base path.
 * @param spaceId the space id.
 * @param requestedPath the requested path (e.g. `/app/dashboard`).
 * @returns the space-aware version of the requested path, inclusive of the server's base path.
 */
export declare function addSpaceIdToPath(basePath?: string, spaceId?: string, requestedPath?: string): string;
