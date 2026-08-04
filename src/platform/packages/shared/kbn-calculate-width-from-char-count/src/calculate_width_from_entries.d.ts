import type { LIMITS } from './calculate_width_from_char_count';
type GenericObject<T = Record<string, any>> = T;
export declare function calculateWidthFromEntries(entries: GenericObject[] | string[], labelKeys?: Array<keyof GenericObject>, overridesPanelWidths?: Partial<LIMITS>): number;
export {};
