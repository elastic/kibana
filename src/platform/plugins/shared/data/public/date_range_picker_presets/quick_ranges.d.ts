import type { PresetItem } from '@kbn/date-range-picker-presets-common';
export declare const TIMEPICKER_QUICK_RANGES_SETTING = "timepicker:quickRanges";
export interface QuickRange {
    from: string;
    to: string;
    display: string;
}
export declare const mapQuickRanges: (quickRanges: readonly QuickRange[]) => PresetItem[];
