import type { Server } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { SessionStorageFactory, SessionStorageCookieOptions } from '@kbn/core-http-server';
/**
 * Creates SessionStorage factory, which abstract the way of
 * session storage implementation and scoping to the incoming requests.
 *
 * @param log - logger instance
 * @param server - hapi server to create SessionStorage for
 * @param cookieOptions - cookies configuration
 * @param disableEmbedding - whether embedding is disabled
 * @param basePath - optional base path for the Kibana server
 */
export declare function createCookieSessionStorageFactory<T extends object>(log: Logger, server: Server, cookieOptions: SessionStorageCookieOptions<T>, disableEmbedding: boolean, basePath?: string): Promise<SessionStorageFactory<T>>;
