import type { Request } from '@hapi/hapi';
import type { LogMeta, Logger } from '@kbn/logging';
/**
 * Converts a hapi `Request` into ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export declare function getEcsResponseLog(request: Request, log: Logger): {
    message: string;
    meta: LogMeta;
};
