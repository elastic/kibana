import type { PluginInitializerContext } from '@kbn/core/public';
import { CpsPlugin } from './plugin';
export declare function plugin(initContext: PluginInitializerContext): CpsPlugin;
export type { CPSPluginSetup, CPSPluginStart, CPSConfigType } from './types';
