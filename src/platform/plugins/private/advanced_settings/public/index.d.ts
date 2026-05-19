import type { PluginInitializerContext } from '@kbn/core/public';
import { AdvancedSettingsPlugin } from './plugin';
export type { AdvancedSettingsSetup, AdvancedSettingsStart } from './types';
export declare function plugin(initializerContext: PluginInitializerContext): AdvancedSettingsPlugin;
