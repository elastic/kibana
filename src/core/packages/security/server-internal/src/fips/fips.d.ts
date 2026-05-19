import type { Logger } from '@kbn/logging';
import type { PKCS12ConfigType, SecurityServiceConfigType } from '../utils';
export declare function isFipsEnabled(config: SecurityServiceConfigType | undefined): boolean;
export declare function checkFipsConfig(config: SecurityServiceConfigType | undefined, elasticsearchConfig: PKCS12ConfigType, serverConfig: PKCS12ConfigType, logger: Logger): void;
