import type { DataTableRecord } from '../types';
/**
 * This function is calculating stats of the available fields, for usage in sidebar and sharing
 * Note that this values aren't displayed, but used for internal calculations
 */
export declare function calcFieldCounts(rows?: DataTableRecord[]): Record<string, number>;
