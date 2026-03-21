import chroma from 'chroma-js';
export declare const enforceColorContrast: (color: string, backgroundColor: string) => boolean;
export declare function isValidColor(colorString?: string): boolean;
export declare const getColorAlpha: (color?: string | null) => number;
export declare const makeColorWithAlpha: (color: string, newAlpha: number) => chroma.Color;
export declare function getValidColor(color?: string | null): chroma.Color | undefined;
export declare function getValidColor(color?: string | null, options?: {
    shouldBeCompatibleWithColorJs: true;
}): chroma.Color;
