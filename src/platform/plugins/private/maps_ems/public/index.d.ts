import type { PluginInitializerContext } from '@kbn/core/public';
import type { EMSClient } from '@elastic/ems-client';
import { MapsEmsPlugin } from './plugin';
import type { MapConfig } from '../server/config';
import type { EMSSettings } from '../common';
export declare function plugin(initializerContext: PluginInitializerContext): MapsEmsPlugin;
export type { MapConfig, TileMapConfig } from '../server/config';
export type { EMSConfig } from '../common';
export interface MapsEmsPluginPublicSetup {
}
export interface MapsEmsPluginPublicStart {
    config: MapConfig;
    createEMSSettings(): EMSSettings;
    createEMSClient(): Promise<EMSClient>;
}
