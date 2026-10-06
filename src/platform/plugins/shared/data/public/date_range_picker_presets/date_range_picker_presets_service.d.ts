/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import {
  type DateRangePickerPresetsService as IDateRangePickerPresetsService,
  type PresetItem,
  type SavePresetOutcome,
} from '@kbn/date-range-picker-presets-common';
export interface DateRangePickerPresetsServiceDeps {
  userStorage: CoreStart['userStorage'];
  uiSettings: CoreStart['uiSettings'];
}
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
export declare class DateRangePickerPresetsService implements IDateRangePickerPresetsService {
  private readonly userStorage;
  private readonly uiSettings;
  constructor({ userStorage, uiSettings }: DateRangePickerPresetsServiceDeps);
  getDefaultPresets(): PresetItem[];
  getPresets$(): Observable<PresetItem[]>;
  canPersist(): boolean;
  savePreset(preset: PresetItem): Promise<SavePresetOutcome>;
  deletePreset(preset: PresetItem): Promise<void>;
  /**
   * The user's own presets, used as the base for a mutation. This key is
   * `preload: false`, so `get()` (never `peek()`) is required — an unhydrated
   * read would persist an empty list over whatever the user already had stored.
   */
  private getStoredPresets;
  private persist;
}
