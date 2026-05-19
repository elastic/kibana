import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
/**
 * Register the sanitize dashboard route.
 * This route uses an internal API path because it is not intended for public use.
 * It is currently used by the dashboard app to sanitize a dashboard for the export share integration.
 */
export declare function registerSanitizeRoute(router: VersionedRouter<RequestHandlerContext>): void;
