import { type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { type DateRangePickerPresetsService as IDateRangePickerPresetsService, type PresetItem, type SavePresetOutcome } from '@kbn/date-range-picker-presets-common';
export interface DateRangePickerPresetsServiceDeps {
    userStorage: CoreStart['userStorage'];
    uiSettings: CoreStart['uiSettings'];
    userProfile: CoreStart['userProfile'];
}
/**
 * Owns date range presets end to end: the quick-ranges defaults (from the
 * `timepicker:quickRanges` uiSetting this plugin registers), the space-scoped
 * `userStorage` overrides (under {@link DATE_RANGE_PICKER_PRESETS_KEY}), and the
 * dedupe/cap rules. Exposed as `data.dateRangePickerPresets` so consumers depend
 * on the storage-agnostic {@link IDateRangePickerPresetsService} contract rather
 * than on `userStorage`/`uiSettings` directly.
 */
export declare class DateRangePickerPresetsService implements IDateRangePickerPresetsService {
    private readonly userStorage;
    private readonly uiSettings;
    private readonly userProfile;
    constructor({ userStorage, uiSettings, userProfile }: DateRangePickerPresetsServiceDeps);
    getDefaultPresets(): PresetItem[];
    getPresets$(): Observable<PresetItem[]>;
    getCanWrite$(): Observable<boolean>;
    savePreset(preset: PresetItem): Promise<SavePresetOutcome>;
    deletePreset(preset: PresetItem): Promise<void>;
    /**
     * Current presets used as the base for a mutation, read synchronously from
     * the local cache via `peek`.
     *
     * NOTE: with the `preload: false` key, `peek` returns the unseeded default
     * until the lazy fetch triggered by `getPresets$` hydrates the cache — so a
     * save issued before hydration can overwrite previously stored presets. A
     * robust fix needs a core "value ready" signal (tracked with the
     * `userStorage.isAvailable` follow-up); centralising writes here makes that a
     * one-spot change.
     */
    private getMutationBase;
    private persist;
}
