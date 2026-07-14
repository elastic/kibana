import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { AuthenticationHandler, AuthResultParams } from '@kbn/core-http-server';
/** @internal */
export declare function adoptToHapiAuthFormat(fn: AuthenticationHandler, log: Logger, onAuth?: (request: Request, data: AuthResultParams) => void): (request: Request, responseToolkit: ResponseToolkit) => Promise<Lifecycle.ReturnValue>;
