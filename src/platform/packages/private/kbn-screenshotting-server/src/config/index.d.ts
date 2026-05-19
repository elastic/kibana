import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { ConfigType } from './schema';
/**
 * Helper function
 */
export declare const durationToNumber: (value: number | moment.Duration) => number;
/**
 * Screenshotting plugin configuration schema.
 */
export declare const config: PluginConfigDescriptor<ConfigType>;
export { createConfig } from './create_config';
export type { ConfigType } from './schema';
