/**
 * Reduces color opacity, by mixing color with background color.
 *
 * This is used when the resulting color needs to be opaque (i.e. alpha of 1).
 */
export declare function decreaseOpacity(baseColor: string, step: number, totalSteps: number): string;
