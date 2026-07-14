import type { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OnPreAuthHandler } from '@kbn/core-http-server';
/**
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests before a user has been authenticated.
 */
export declare function adoptToHapiOnPreAuth(fn: OnPreAuthHandler, log: Logger): (request: Request, responseToolkit: HapiResponseToolkit) => Promise<Lifecycle.ReturnValue>;
