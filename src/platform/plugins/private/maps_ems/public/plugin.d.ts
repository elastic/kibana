import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart } from '.';
import type { MapConfig } from '../server/config';
interface MapsEmsStartPublicDependencies {
    licensing?: LicensingPluginStart;
}
export declare class MapsEmsPlugin implements Plugin<MapsEmsPluginPublicSetup, MapsEmsPluginPublicStart> {
    readonly _initializerContext: PluginInitializerContext<MapConfig>;
    constructor(initializerContext: PluginInitializerContext<MapConfig>);
    setup(): {};
    start(code: CoreStart, plugins: MapsEmsStartPublicDependencies): {
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
        createEMSSettings: () => import("../common/ems_settings").EMSSettings;
        createEMSClient: () => Promise<import("@elastic/ems-client").EMSClient>;
    };
}
export {};
