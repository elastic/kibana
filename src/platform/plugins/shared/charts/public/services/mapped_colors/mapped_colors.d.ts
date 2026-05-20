/**
 * Maintains a lookup table that associates the value (key) with a hex color (value)
 * across the visualizations.
 * Provides functions to interact with the lookup table
 */
export declare class MappedColors {
    private colorPaletteFn;
    private _mapping;
    constructor(colorPaletteFn?: (num: number) => string[]);
    get mapping(): any;
    get(key: string | number): any;
    mapKeys(keys: Array<string | number>): void;
}
