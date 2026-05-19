import type { TypeOf } from '@kbn/config-schema';
export declare const tilemapConfigSchema: import("@kbn/config-schema").ObjectType<{
    url: import("@kbn/config-schema").Type<string | undefined>;
    options: import("@kbn/config-schema").ObjectType<{
        attribution: import("@kbn/config-schema").Type<string>;
        minZoom: import("@kbn/config-schema").Type<number>;
        maxZoom: import("@kbn/config-schema").Type<number>;
        tileSize: import("@kbn/config-schema").Type<number | undefined>;
        subdomains: import("@kbn/config-schema").Type<string[] | undefined>;
        errorTileUrl: import("@kbn/config-schema").Type<string | undefined>;
        tms: import("@kbn/config-schema").Type<boolean | undefined>;
        reuseTiles: import("@kbn/config-schema").Type<boolean | undefined>;
        bounds: import("@kbn/config-schema").Type<number[] | undefined>;
        default: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const mapConfigSchema: import("@kbn/config-schema").ObjectType<{
    tilemap: import("@kbn/config-schema").ObjectType<{
        url: import("@kbn/config-schema").Type<string | undefined>;
        options: import("@kbn/config-schema").ObjectType<{
            attribution: import("@kbn/config-schema").Type<string>;
            minZoom: import("@kbn/config-schema").Type<number>;
            maxZoom: import("@kbn/config-schema").Type<number>;
            tileSize: import("@kbn/config-schema").Type<number | undefined>;
            subdomains: import("@kbn/config-schema").Type<string[] | undefined>;
            errorTileUrl: import("@kbn/config-schema").Type<string | undefined>;
            tms: import("@kbn/config-schema").Type<boolean | undefined>;
            reuseTiles: import("@kbn/config-schema").Type<boolean | undefined>;
            bounds: import("@kbn/config-schema").Type<number[] | undefined>;
            default: import("@kbn/config-schema").Type<boolean | undefined>;
        }>;
    }>;
    includeElasticMapsService: import("@kbn/config-schema").Type<boolean>;
    emsUrl: import("@kbn/config-schema").Type<string>;
    emsFileApiUrl: import("@kbn/config-schema").Type<string>;
    emsTileApiUrl: import("@kbn/config-schema").Type<string>;
    emsLandingPageUrl: import("@kbn/config-schema").Type<string>;
    emsFontLibraryUrl: import("@kbn/config-schema").Type<string>;
    emsTileLayerId: import("@kbn/config-schema").ObjectType<{
        bright: import("@kbn/config-schema").Type<string>;
        desaturated: import("@kbn/config-schema").Type<string>;
        dark: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export type MapConfig = TypeOf<typeof mapConfigSchema>;
export type TileMapConfig = TypeOf<typeof tilemapConfigSchema>;
