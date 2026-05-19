import type { Optional } from 'utility-types';
import type { KbnBasePaletteConfig } from './palette';
import { KbnBasePalette } from './palette';
import type { IKbnPalette, KbnPaletteType } from './types';
export interface KbnColorFnPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
    type: KbnPaletteType;
    colorFn: (n: number) => string[];
    /**
     * Default number of colors returned from `colors` method.
     *
     * @default `colorCount`
     */
    defaultNumberOfColors?: number;
}
export declare class KbnColorFnPalette extends KbnBasePalette implements IKbnPalette {
    #private;
    readonly type: KbnPaletteType;
    constructor({ type, colorFn, defaultNumberOfColors, colorCount, ...rest }: KbnColorFnPaletteConfig);
    colors: (n?: number) => string[];
}
