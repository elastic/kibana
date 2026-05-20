import { KbnColorFnPalette } from '../../classes/color_fn_palette';
/**
 * Swaps color pairs within each group of 10 to increase contrast
 * between adjacent hues (e.g., separating pink and red).
 */
export declare function swapColorPairs(colors: string[]): string[];
/**
 * Reorders colors so dark tones (even indices) come before light tones (odd indices)
 * within each group of 10 colors.
 */
export declare function reorderDarkFirst(colors: string[]): string[];
export declare const elasticLineOptimizedPalette: KbnColorFnPalette;
