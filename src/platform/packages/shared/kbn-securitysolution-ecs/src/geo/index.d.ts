export interface GeoEcs {
    city_name?: string[];
    continent_name?: string[];
    country_iso_code?: string[];
    country_name?: string[];
    location?: Location;
    region_iso_code?: string[];
    region_name?: string[];
}
export interface Location {
    lon?: number[];
    lat?: number[];
}
