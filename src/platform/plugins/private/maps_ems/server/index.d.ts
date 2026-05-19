import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import type { MapConfig } from './config';
export type { EMSSettings } from '../common';
export type { MapsEmsPluginServerSetup } from './plugin';
export declare const config: PluginConfigDescriptor<MapConfig>;
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").MapsEmsPlugin>;
