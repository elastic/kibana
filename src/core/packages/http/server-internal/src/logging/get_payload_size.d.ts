import type { Request } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
type Response = Request['response'];
/**
 * Attempts to determine the size (in bytes) of a Hapi response
 * body based on the payload type. Falls back to `undefined`
 * if the size cannot be determined from the response object.
 *
 * @param response Hapi response object or Boom error
 *
 * @internal
 */
export declare function getResponsePayloadBytes(response: Response, log: Logger): number | undefined;
export {};
