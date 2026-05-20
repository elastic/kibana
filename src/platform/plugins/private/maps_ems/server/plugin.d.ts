import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { Plugin, PluginInitializerContext } from '@kbn/core-plugins-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { MapConfig } from './config';
import { EMSSettings } from '../common';
export interface MapsEmsPluginServerSetup {
    config: MapConfig;
    createEMSSettings: () => EMSSettings;
}
interface MapsEmsStartServerDependencies {
    licensing?: LicensingPluginStart;
}
export declare class MapsEmsPlugin implements Plugin<MapsEmsPluginServerSetup> {
    readonly _initializerContext: PluginInitializerContext<MapConfig>;
    constructor(initializerContext: PluginInitializerContext<MapConfig>);
    setup(core: CoreSetup<MapsEmsStartServerDependencies>): {
        config: Readonly<{} & {
            tilemap: Readonly<{
                url?: string | undefined;
            } & {
                options: Readonly<{
                    default?: boolean | undefined;
                    bounds?: number[] | undefined;
                    tileSize?: number | undefined;
                    subdomains?: string[] | undefined;
                    errorTileUrl?: string | undefined;
                    tms?: boolean | undefined;
                    reuseTiles?: boolean | undefined;
                } & {
                    attribution: string;
                    minZoom: number;
                    maxZoom: number;
                }>;
            }>;
            includeElasticMapsService: boolean;
            emsUrl: string;
            emsFileApiUrl: string;
            emsTileApiUrl: string;
            emsLandingPageUrl: string;
            emsFontLibraryUrl: string;
            emsTileLayerId: Readonly<{} & {
                dark: string;
                bright: string;
                desaturated: string;
            }>;
        }>;
        createEMSSettings: () => EMSSettings;
    };
    start(): {};
}
export {};
