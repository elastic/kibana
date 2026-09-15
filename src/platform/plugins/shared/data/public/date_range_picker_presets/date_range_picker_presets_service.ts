/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { map, type Observable } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import {
  DATE_RANGE_PICKER_PRESETS_KEY,
  DEFAULT_STORED_PRESETS,
  MAX_PRESETS,
  getPresetKey,
  mergePresets,
  migrateStoredPresets,
  type DateRangePickerPresetsService as IDateRangePickerPresetsService,
  type PresetItem,
  type SavePresetOutcome,
  type StoredPresets,
} from '@kbn/date-range-picker-presets-common';

import { mapQuickRanges, TIMEPICKER_QUICK_RANGES_SETTING, type QuickRange } from './quick_ranges';

export interface DateRangePickerPresetsServiceDeps {
  userStorage: CoreStart['userStorage'];
  uiSettings: CoreStart['uiSettings'];
}

const toPresetItem = ({ start, end, label }: PresetItem): PresetItem => ({
  start,
  end,
  ...(label ? { label } : {}),
});

/**
 * Owns date range presets end to end: the locked quick ranges (from the
 * `timepicker:quickRanges` uiSetting this plugin registers), the space-scoped
 * `userStorage` overrides (under {@link DATE_RANGE_PICKER_PRESETS_KEY}), and the
 * dedupe/cap rules. Exposed as `data.dateRangePickerPresets` so consumers depend
 * on the storage-agnostic {@link IDateRangePickerPresetsService} contract rather
 * than on `userStorage`/`uiSettings` directly.
 *
 * Storage holds the user's own presets only. The quick ranges are merged in on
 * every read, so they stay administrator-owned: not editable here, and picked up
 * as soon as the uiSetting changes.
 */
export class DateRangePickerPresetsService implements IDateRangePickerPresetsService {
  private readonly userStorage: CoreStart['userStorage'];
  private readonly uiSettings: CoreStart['uiSettings'];

  constructor({ userStorage, uiSettings }: DateRangePickerPresetsServiceDeps) {
    this.userStorage = userStorage;
    this.uiSettings = uiSettings;
  }

  public getDefaultPresets(): PresetItem[] {
    return mapQuickRanges(this.uiSettings.get<QuickRange[]>(TIMEPICKER_QUICK_RANGES_SETTING) ?? []);
  }

  public getPresets$(): Observable<PresetItem[]> {
    return this.userStorage
      .get$<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, DEFAULT_STORED_PRESETS)
      .pipe(
        map((stored) => {
          const defaultPresets = this.getDefaultPresets();

          return mergePresets(migrateStoredPresets(stored, defaultPresets).presets, defaultPresets);
        })
      );
  }

  public canPersist(): boolean {
    return this.userStorage.isAvailable();
  }

  public async savePreset(preset: PresetItem): Promise<SavePresetOutcome> {
    const presetKey = getPresetKey(preset);
    const base = await this.getStoredPresets();
    const matchesExistingPreset = [...base, ...this.getDefaultPresets()].some(
      (item) => getPresetKey(item) === presetKey
    );

    if (matchesExistingPreset) return 'duplicate';
    if (base.length >= MAX_PRESETS) return 'limit-reached';

    // Stored newest first, so a saved preset lands at the top of the displayed list.
    await this.persist([preset, ...base]);
    return 'saved';
  }

  public async deletePreset(preset: PresetItem): Promise<void> {
    const presetKey = getPresetKey(preset);
    const base = await this.getStoredPresets();
    const next = base.filter((item) => getPresetKey(item) !== presetKey);

    // A quick range is never stored, so there is nothing to remove and no reason to write.
    if (next.length === base.length) return;

    await this.persist(next);
  }

  /**
   * The user's own presets, used as the base for a mutation. This key is
   * `preload: false`, so `get()` (never `peek()`) is required — an unhydrated
   * read would persist an empty list over whatever the user already had stored.
   */
  private async getStoredPresets(): Promise<PresetItem[]> {
    const stored = await this.userStorage.get<StoredPresets>(
      DATE_RANGE_PICKER_PRESETS_KEY,
      DEFAULT_STORED_PRESETS
    );

    return migrateStoredPresets(stored, this.getDefaultPresets()).presets;
  }

  private async persist(presets: PresetItem[]): Promise<void> {
    await this.userStorage.set<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, {
      version: 2,
      presets: presets.map(toPresetItem),
    });
  }
}
