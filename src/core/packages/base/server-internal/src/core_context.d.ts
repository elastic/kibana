import type { IConfigService, Env } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import type { CoreId } from '@kbn/core-base-common-internal';
/**
 * Groups all main Kibana's core modules/systems/services that are consumed in a
 * variety of places within the core itself.
 * @internal
 */
export interface CoreContext {
    coreId: CoreId;
    env: Env;
    configService: IConfigService;
    logger: LoggerFactory;
}
