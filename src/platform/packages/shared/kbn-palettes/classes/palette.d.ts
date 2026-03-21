import type { Optional } from 'utility-types';
import type { IKbnPalette, KbnPaletteType } from './types';
export type KbnBasePaletteConfig = Optional<Pick<IKbnPalette, 'id' | 'name' | 'tag' | 'colorCount' | 'legacy' | 'aliases' | 'standalone'>, 'legacy' | 'aliases'>;
export declare abstract class KbnBasePalette implements IKbnPalette {
    abstract type: KbnPaletteType;
    readonly id: IKbnPalette['id'];
    readonly name: string;
    readonly tag?: string;
    readonly colorCount: number;
    readonly legacy: boolean;
    readonly standalone: boolean;
    readonly aliases: string[];
    constructor({ id, name, tag, colorCount, aliases, legacy, standalone, }: KbnBasePaletteConfig);
    abstract colors: (n?: number | undefined) => string[];
    getColor: (colorIndex: number, numberOfColors?: number) => string;
}
