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
  normalize,
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
 * Owns date range presets end to end: the quick-ranges defaults (from the
 * `timepicker:quickRanges` uiSetting this plugin registers), the space-scoped
 * `userStorage` overrides (under {@link DATE_RANGE_PICKER_PRESETS_KEY}), and the
 * dedupe/cap rules. Exposed as `data.dateRangePickerPresets` so consumers depend
 * on the storage-agnostic {@link IDateRangePickerPresetsService} contract rather
 * than on `userStorage`/`uiSettings` directly.
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
      .pipe(map((stored) => normalize(stored).presets ?? this.getDefaultPresets()));
  }

  public canPersist(): boolean {
    return this.userStorage.isAvailable();
  }

  public async savePreset(preset: PresetItem): Promise<SavePresetOutcome> {
    const presetKey = getPresetKey(preset);
    const base = await this.getStoredPresets();

    if (base.some((item) => getPresetKey(item) === presetKey)) return 'duplicate';
    if (base.length >= MAX_PRESETS) return 'limit-reached';

    await this.userStorage.set<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, {
      version: 1,
      presets: [...base, preset].map(toPresetItem),
    });

    return 'saved';
  }

  public async deletePreset(preset: PresetItem): Promise<void> {
    const presetKey = getPresetKey(preset);
    const base = await this.getStoredPresets();
    const next = base.filter((item) => getPresetKey(item) !== presetKey);

    // Nothing matched — skip the write.
    if (next.length === base.length) return;

    await this.userStorage.set<StoredPresets>(DATE_RANGE_PICKER_PRESETS_KEY, {
      version: 1,
      presets: next.map(toPresetItem),
    });
  }

  /**
   * Resolved read for use as a write base. This key is `preload: false`, so
   * `get()` (never `peek()`) is required — an unhydrated read would persist the
   * defaults over whatever the user already had stored.
   */
  private async getStoredPresets(): Promise<PresetItem[]> {
    const stored = await this.userStorage.get<StoredPresets>(
      DATE_RANGE_PICKER_PRESETS_KEY,
      DEFAULT_STORED_PRESETS
    );
    return normalize(stored).presets ?? this.getDefaultPresets();
  }
}
