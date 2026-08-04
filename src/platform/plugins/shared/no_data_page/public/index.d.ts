import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { NoDataPagePlugin } from './plugin';
export declare function plugin(ctx: PluginInitializerContext): NoDataPagePlugin;
export type { NoDataPagePublicSetup as NoDataPagePluginSetup, NoDataPagePublicStart as NoDataPagePluginStart, } from './types';
