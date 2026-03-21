import type { KbnPaletteId } from '@kbn/palettes';
/**
 * Defines explicit color specified as a CSS color datatype (rgb/a,hex,keywords,lab,lch etc)
 */
export interface ColorCode {
    type: 'colorCode';
    colorCode: string;
}
/**
 * Defines categorical color based on the index position of color in palette defined by the paletteId
 */
export interface CategoricalColor {
    type: 'categorical';
    paletteId: KbnPaletteId;
    colorIndex: number;
}
/**
 * Defines color based on looping round-robin assignment
 */
export interface LoopColor {
    type: 'loop';
}
/**
 * Specify that the Color in an Assignment needs to be taken from a gradient defined in the `Config.colorMode`
 */
export interface GradientColor {
    type: 'gradient';
}
export type Color = ColorCode | CategoricalColor | LoopColor | GradientColor;
