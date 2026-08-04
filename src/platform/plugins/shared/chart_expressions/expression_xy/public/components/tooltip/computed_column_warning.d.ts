import type { CommonXYDataLayerConfig } from '../../../common';
/**
 * Returns the warning message to show when ES|QL filterable columns (x-accessor and/or
 * split accessors) are computed fields that cannot be used for filtering. Returns
 * `undefined` when there is nothing to warn about.
 */
export declare const getComputedColumnWarning: (dataLayers: CommonXYDataLayerConfig[]) => string | undefined;
