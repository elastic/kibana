/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

export const DATE_RANGE_PICKER_PRESETS_KEY = 'data:dateRangePicker:presets';
export const MAX_PRESETS = 40;

export interface PresetItem {
  start: string;
  end: string;
  label?: string;
  /** Presets from `timepicker:quickRanges` set this to `false`. */
  isEditable?: boolean;
}

/**
 * Legacy shape, where the stored list was the *whole* displayed list: on first
 * save the quick ranges from UI settings were copied into storage alongside
 * the user's own presets, which made them deletable. `null` meant "not yet seeded".
 */
export interface StoredPresetsV1 {
  version: 1;
  presets: PresetItem[] | null;
}

/** Holds the user's own presets only; the quick ranges are merged in at read time. */
export interface StoredPresetsV2 {
  version: 2;
  presets: PresetItem[];
}

export type StoredPresets = StoredPresetsV1 | StoredPresetsV2;

export const DEFAULT_STORED_PRESETS: StoredPresetsV2 = {
  version: 2,
  presets: [],
};

/**
 * Stable identity of a preset: two presets are considered the same when their
 * `start` and `end` bounds match. Used for dedupe on save and to locate the
 * item to remove on delete. The `label` is intentionally excluded.
 */
export const getPresetKey = ({ start, end }: Pick<PresetItem, 'start' | 'end'>): string =>
  `${start}|${end}`;

/**
 * Reads any stored shape as the v2 user-owned list.
 *
 * v1 documents contain a copy of the quick ranges made when the list was
 * seeded, so those are subtracted to recover the user's own additions. A range
 * the admin has since removed from `timepicker:quickRanges` survives as a user
 * preset — the user keeps it and can now delete it.
 */
export const migrateStoredPresets = (
  storedPresets: StoredPresets | undefined,
  uiSettingsPresets: readonly PresetItem[]
): StoredPresetsV2 => {
  if (storedPresets?.version === 2) {
    return storedPresets;
  }

  if (storedPresets?.version === 1 && storedPresets.presets) {
    const uiSettingsKeys = new Set(uiSettingsPresets.map(getPresetKey));

    return {
      version: 2,
      presets: storedPresets.presets.filter((preset) => !uiSettingsKeys.has(getPresetKey(preset))),
    };
  }

  return DEFAULT_STORED_PRESETS;
};

/**
 * Composes the displayed list: the user's own editable presets, then
 * the default quick ranges that get `isEditable=false`.
 */
export const mergePresets = (
  userPresets: readonly PresetItem[],
  defaultPresets: readonly PresetItem[]
): PresetItem[] => {
  const userKeys = new Set(userPresets.map(getPresetKey));

  return [
    ...userPresets,
    ...defaultPresets
      .filter((preset) => !userKeys.has(getPresetKey(preset)))
      .map((preset) => ({ ...preset, isEditable: false })),
  ];
};

/** Outcome of a {@link DateRangePickerPresetsService.savePreset} call. */
export type SavePresetOutcome =
  | 'saved' // persisted a new preset
  | 'duplicate' // an equal preset (by `start`/`end`) already exists — no-op
  | 'limit-reached'; // MAX_PRESETS user presets already stored — no-op

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
   * Synchronous presets derived from the configured quick ranges. Shown
   * on their own when persistence is disabled.
   */
  getDefaultPresets(): PresetItem[];

  /**
   * Presets to display: the user's own editable presets followed by the default
   * {@link getDefaultPresets}. Emits again whenever the stored value changes.
   */
  getPresets$(): Observable<PresetItem[]>;

  /**
   * Whether the current user can persist presets. `false` (for example, for a
   * user without a profile) means save/delete must be disabled.
   */
  canPersist(): boolean;

  /**
   * Persists `preset` as a user preset, deduping (by `start`/`end`) against both
   * the stored user presets and the quick ranges, and enforcing the
   * {@link MAX_PRESETS} cap. Resolves with the {@link SavePresetOutcome};
   * rejects if the underlying write fails.
   */
  savePreset(preset: PresetItem): Promise<SavePresetOutcome>;

  /**
   * Removes the stored user preset matching `preset` (by `start`/`end`). Presets
   * coming from the quick ranges are not stored, so they cannot be removed.
   * Rejects if the underlying write fails.
   */
  deletePreset(preset: PresetItem): Promise<void>;
}
