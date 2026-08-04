import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DateRangePickerPresetsService, PresetItem } from '@kbn/date-range-picker-presets-common';
export interface UseDateRangePickerPresetsArgs {
    /**
     * Storage-agnostic presets service (e.g. `data.dateRangePickerPresets`). Owns
     * the persistence mechanism and the dedupe/cap rules; this hook only adapts it
     * to the picker props and surfaces failures as toasts.
     */
    service: DateRangePickerPresetsService;
    /**
     * When `false`, presets are the read-only quick-ranges defaults: no stored
     * value is read and save/delete are unavailable. Consumers gate this on their
     * persistence feature flag.
     */
    persistenceEnabled: boolean;
    notifications: NotificationsStart;
}
export interface UseDateRangePickerPresetsResult {
    presets: PresetItem[];
    onPresetSave?: (option: PresetItem) => void;
    onPresetDelete?: (option: PresetItem) => void;
}
export declare const useDateRangePickerPresets: ({ service, persistenceEnabled, notifications, }: UseDateRangePickerPresetsArgs) => UseDateRangePickerPresetsResult;
