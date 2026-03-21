import chroma from 'chroma-js';
export declare function getValidColor(color: string): chroma.Color;
export declare function hasEnoughContrast(color: string, isDark: boolean, threshold?: number): boolean;
export declare function changeAlpha(color: string, alpha: number): string;
export declare function toHex(color: string): string;
export declare function isSameColor(color1: string, color2: string): boolean;
/**
 * Blend a foreground (fg) color with a background (bg) color
 */
export declare function combineColors(fg: string, bg: string): string;
