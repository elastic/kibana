/**
 * This is a name of configuration node that is specifically dedicated to
 * the configuration values used by the new platform only. Eventually all
 * its nested values will be migrated to the stable config and this node
 * will be deprecated.
 */
export const NEW_PLATFORM_CONFIG_ROOT = '__newPlatform';

export { ConfigService } from './config_service';
export { RawConfigService } from './raw_config_service';
export { RawConfig } from './raw_config';
/** @internal */
export { ObjectToRawConfigAdapter } from './object_to_raw_config_adapter';
export { Env } from './env';
export { ConfigWithSchema } from './config_with_schema';
