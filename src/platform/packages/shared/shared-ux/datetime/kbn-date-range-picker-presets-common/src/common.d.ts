import type { Observable } from 'rxjs';
export declare const DATE_RANGE_PICKER_PRESETS_KEY = "data:dateRangePicker:presets";
export declare const MAX_PRESETS = 40;
export interface PresetItem {
    start: string;
    end: string;
    label?: string;
}
export interface StoredPresetsV1 {
    version: 1;
    presets: PresetItem[] | null;
}
export type StoredPresets = StoredPresetsV1;
export declare const DEFAULT_STORED_PRESETS: StoredPresets;
export declare const normalize: (storedPresets?: StoredPresets) => StoredPresets;
/**
 * Stable identity of a preset: two presets are considered the same when their
 * `start` and `end` bounds match. Used for dedupe on save and to locate the
 * item to remove on delete. The `label` is intentionally excluded.
 */
export declare const getPresetKey: ({ start, end }: Pick<PresetItem, "start" | "end">) => string;
/** Outcome of a {@link DateRangePickerPresetsService.savePreset} call. */
export type SavePresetOutcome = 'saved' | 'duplicate' | 'limit-reached';
/**
 * Storage-agnostic contract for reading and persisting date range presets.
 *
 * The reusable `useDateRangePickerPresets` hook depends only on this interface,
 * never on `userStorage`/`uiSettings` directly. A plugin owns the concrete
 * implementation (e.g. `data.dateRangePickerPresets`), keeping the persistence
 * mechanism and the registered storage key out of the shared UI package.
 */
export interface DateRangePickerPresetsService {
    /**
     * Synchronous default presets derived from the configured quick ranges,
     * with no stored data. Shown when persistence is disabled or nothing is
     * stored yet.
     */
    getDefaultPresets(): PresetItem[];
    /**
     * Resolved presets to display: the user's stored presets when present,
     * otherwise {@link getDefaultPresets}. Emits again whenever the stored value
     * changes.
     */
    getPresets$(): Observable<PresetItem[]>;
    /**
     * Whether the current user can persist presets. `false` (for example, for a
     * user without a profile) means save/delete must be disabled.
     */
    getCanWrite$(): Observable<boolean>;
    /**
     * Persists `preset`, enforcing dedupe (by `start`/`end`) and the
     * {@link MAX_PRESETS} cap. Resolves with the {@link SavePresetOutcome};
     * rejects if the underlying write fails.
     */
    savePreset(preset: PresetItem): Promise<SavePresetOutcome>;
    /**
     * Removes the stored preset matching `preset` (by `start`/`end`). Rejects if
     * the underlying write fails.
     */
    deletePreset(preset: PresetItem): Promise<void>;
}
