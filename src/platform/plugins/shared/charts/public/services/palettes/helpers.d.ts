import type { CustomPaletteState } from '../..';
/**
 * When stops are empty, it is assumed a predefined palette, so colors are distributed uniformly in the whole data range
 * When stops are passed, then rangeMin/rangeMax are used as reference for user defined limits:
 * continuity is defined over rangeMin/rangeMax, not these stops values (rangeMin/rangeMax are computed from user's stop inputs)
 */
export declare function workoutColorForValue(value: number | undefined, params: CustomPaletteState, minMax: {
    min: number;
    max: number;
}): string | undefined;
