export declare const converter: any;
export declare function withinRange(value: string | number, min: number, max: number): {
    isInvalid: boolean;
    error: string | null;
};
export declare function ddToUTM(lat: number, lon: number): {
    northing: string;
    easting: string;
    zone: string;
};
export declare function utmToDD(northing: string, easting: string, zoneNumber: string): any;
export declare function ddToDMS(lat: number, lon: number): string;
export declare function ddToMGRS(lat: number, lon: number): any;
export declare function mgrstoUSNG(mgrs: string): string;
export declare function mgrsToDD(mgrs: string): any;
