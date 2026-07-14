import type { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OnPreResponseHandler } from '@kbn/core-http-server';
/**
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export declare function adoptToHapiOnPreResponseFormat(fn: OnPreResponseHandler, log: Logger): (request: Request, responseToolkit: HapiResponseToolkit) => Promise<Lifecycle.ReturnValue>;
