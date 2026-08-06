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
  userProfile: CoreStart['userProfile'];
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
 * every read, so they stay administrator-owned: undeletable here, and picked up
 * as soon as the uiSetting changes.
 */
export class DateRangePickerPresetsService implements IDateRangePickerPresetsService {
  private readonly userStorage: CoreStart['userStorage'];
  private readonly uiSettings: CoreStart['uiSettings'];
  private readonly userProfile: CoreStart['userProfile'];

  constructor({ userStorage, uiSettings, userProfile }: DateRangePickerPresetsServiceDeps) {
    this.userStorage = userStorage;
    this.uiSettings = uiSettings;
    this.userProfile = userProfile;
  }

  public getUiSettingsPresets(): PresetItem[] {
    return mapQuickRanges(this.uiSettings.get<QuickRange[]>(TIMEPICKER_QUICK_RANGES_SETTING) ?? []);
  }

  public getPresets$(): Observable<PresetItem[]> {
    return this.userStorage
      .get$<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, DEFAULT_STORED_PRESETS)
      .pipe(
        map((stored) => {
          const uiSettingsPresets = this.getUiSettingsPresets();

          return mergePresets(
            migrateStoredPresets(stored, uiSettingsPresets).presets,
            uiSettingsPresets
          );
        })
      );
  }

  public getCanWrite$(): Observable<boolean> {
    return this.userProfile.getUserProfile$().pipe(map((profile) => Boolean(profile)));
  }

  public async savePreset(preset: PresetItem): Promise<SavePresetOutcome> {
    const base = this.getMutationBase();
    const presetKey = getPresetKey(preset);
    const matchesExistingPreset = [...base, ...this.getUiSettingsPresets()].some(
      (item) => getPresetKey(item) === presetKey
    );

    if (matchesExistingPreset) {
      return 'duplicate';
    }

    if (base.length >= MAX_PRESETS) {
      return 'limit-reached';
    }

    await this.persist([...base, preset]);
    return 'saved';
  }

  public async deletePreset(preset: PresetItem): Promise<void> {
    const presetKey = getPresetKey(preset);
    const base = this.getMutationBase();
    const next = base.filter((item) => getPresetKey(item) !== presetKey);

    // A quick range is never stored, so there is nothing to remove and no reason to write.
    if (next.length === base.length) {
      return;
    }

    await this.persist(next);
  }

  /**
   * The user's own presets, used as the base for a mutation and read
   * synchronously from the local cache via `peek`.
   *
   * NOTE: with the `preload: false` key, `peek` returns the empty default until
   * the lazy fetch triggered by `getPresets$` hydrates the cache — so a save
   * issued before hydration can overwrite previously stored user presets. A
   * robust fix needs a core "value ready" signal (tracked with the
   * `userStorage.isAvailable` follow-up); centralising writes here makes that a
   * one-spot change.
   */
  private getMutationBase(): PresetItem[] {
    return migrateStoredPresets(
      this.userStorage.peek<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, DEFAULT_STORED_PRESETS),
      this.getUiSettingsPresets()
    ).presets;
  }

  private async persist(presets: PresetItem[]): Promise<void> {
    await this.userStorage.set<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, {
      version: 2,
      presets: presets.map(toPresetItem),
    });
  }
}
