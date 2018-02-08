/**
 * This is a name of configuration node that is specifically dedicated to
 * the configuration values used by the new platform only. Eventually all
 * its nested values will be migrated to the stable config and this node
 * will be deprecated.
 */
export const NEW_PLATFORM_CONFIG_ROOT = '__newPlatform';

export { ConfigService } from './ConfigService';
export { RawConfigService } from './RawConfigService';
export { RawConfig } from './RawConfig';
/** @internal */
export { ObjectToRawConfigAdapter } from './ObjectToRawConfigAdapter';
export { Env } from './Env';
export { ConfigWithSchema } from './ConfigWithSchema';
