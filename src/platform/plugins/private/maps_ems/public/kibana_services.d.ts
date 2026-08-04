import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { MapConfig } from '../server/config';
export declare const setKibanaVersion: (version: string) => string;
export declare const getKibanaVersion: () => string;
export declare const setMapConfig: (mapsEms: MapConfig) => void;
export declare const getMapConfig: () => Readonly<{} & {
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
export declare function getIsEnterprisePlus(): boolean;
export declare function setLicensingPluginStart(licensingPlugin: LicensingPluginStart): Promise<void>;
