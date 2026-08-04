import type { Optional } from 'utility-types';
import type { KbnBasePaletteConfig } from './palette';
import { KbnBasePalette } from './palette';
import type { IKbnPalette } from './types';
export interface KbnCategoricalPaletteConfig extends Optional<KbnBasePaletteConfig, 'colorCount'> {
    colors: string[];
}
export declare class KbnCategoricalPalette extends KbnBasePalette implements IKbnPalette {
    #private;
    readonly type: "categorical";
    constructor({ colors, colorCount, ...rest }: KbnCategoricalPaletteConfig);
    colors: (n?: number) => string[];
}
