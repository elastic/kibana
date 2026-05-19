import type { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OnPostAuthHandler } from '@kbn/core-http-server';
/**
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export declare function adoptToHapiOnPostAuthFormat(fn: OnPostAuthHandler, log: Logger): (request: Request, responseToolkit: HapiResponseToolkit) => Promise<Lifecycle.ReturnValue>;
