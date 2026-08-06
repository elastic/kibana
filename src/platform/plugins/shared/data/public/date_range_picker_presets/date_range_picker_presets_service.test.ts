/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import {
  DATE_RANGE_PICKER_PRESETS_KEY,
  DEFAULT_STORED_PRESETS,
  MAX_PRESETS,
  type PresetItem,
  type StoredPresets,
  type StoredPresetsV2,
} from '@kbn/date-range-picker-presets-common';

import { DateRangePickerPresetsService } from './date_range_picker_presets_service';
import { TIMEPICKER_QUICK_RANGES_SETTING } from './quick_ranges';

const quickRanges = [
  { from: 'now/d', to: 'now/d', display: 'Today' },
  { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
];

const quickRangePresets: PresetItem[] = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
];

const lockedQuickRangePresets: PresetItem[] = quickRangePresets.map((preset) => ({
  ...preset,
  isDeletable: false,
}));

const setup = () => {
  const core = coreMock.createStart();
  core.uiSettings.get.mockImplementation((key: string) =>
    key === TIMEPICKER_QUICK_RANGES_SETTING ? quickRanges : undefined
  );

  const service = new DateRangePickerPresetsService({
    userStorage: core.userStorage,
    uiSettings: core.uiSettings,
    userProfile: core.userProfile,
  });

  return { core, service };
};

const storedPresets = (presets: PresetItem[]): StoredPresetsV2 => ({ version: 2, presets });
const legacyStoredPresets = (presets: PresetItem[] | null): StoredPresets => ({
  version: 1,
  presets,
});

describe('DateRangePickerPresetsService', () => {
  describe('getUiSettingsPresets', () => {
    it('maps the configured quick ranges to presets', () => {
      const { service } = setup();
      expect(service.getUiSettingsPresets()).toEqual(quickRangePresets);
    });

    it('returns an empty list when no quick ranges are configured', () => {
      const { core, service } = setup();
      core.uiSettings.get.mockReturnValue(undefined);
      expect(service.getUiSettingsPresets()).toEqual([]);
    });
  });

  describe('getPresets$', () => {
    it('emits the user presets ahead of the locked quick ranges', async () => {
      const { core, service } = setup();
      core.userStorage.get$.mockReturnValue(
        of(storedPresets([{ start: 'now-1h', end: 'now', label: 'Last hour' }]))
      );

      expect(await firstValueFrom(service.getPresets$())).toEqual([
        { start: 'now-1h', end: 'now', label: 'Last hour', isDeletable: true },
        ...lockedQuickRangePresets,
      ]);
    });

    it('emits the most recently saved preset at the top of the list', async () => {
      const { core, service } = setup();
      const newest: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };
      const oldest: PresetItem = { start: 'now-2h', end: 'now', label: 'Last 2 hours' };
      core.userStorage.get$.mockReturnValue(of(storedPresets([newest, oldest])));

      expect(await firstValueFrom(service.getPresets$())).toEqual([
        { ...newest, isDeletable: true },
        { ...oldest, isDeletable: true },
        ...lockedQuickRangePresets,
      ]);
    });

    it('emits only the locked quick ranges when nothing is stored', async () => {
      const { core, service } = setup();
      core.userStorage.get$.mockReturnValue(of(DEFAULT_STORED_PRESETS));

      expect(await firstValueFrom(service.getPresets$())).toEqual(lockedQuickRangePresets);
    });

    it('treats a legacy seeded value as quick ranges plus the user additions', async () => {
      const { core, service } = setup();
      core.userStorage.get$.mockReturnValue(
        of(legacyStoredPresets([...quickRangePresets, { start: 'now-1h', end: 'now' }]))
      );

      expect(await firstValueFrom(service.getPresets$())).toEqual([
        { start: 'now-1h', end: 'now', isDeletable: true },
        ...lockedQuickRangePresets,
      ]);
    });

    it('picks up quick ranges added after the user stored their own presets', async () => {
      const { core, service } = setup();
      core.userStorage.get$.mockReturnValue(of(storedPresets([])));
      core.uiSettings.get.mockReturnValue([{ from: 'now-1y', to: 'now', display: 'Last year' }]);

      expect(await firstValueFrom(service.getPresets$())).toEqual([
        { start: 'now-1y', end: 'now', label: 'Last year', isDeletable: false },
      ]);
    });
  });

  describe('getCanWrite$', () => {
    it('is true when the user has a profile', async () => {
      const { core, service } = setup();
      // A non-null profile is all that matters; shape is irrelevant here.
      (core.userProfile.getUserProfile$ as jest.Mock).mockReturnValue(of({}));

      expect(await firstValueFrom(service.getCanWrite$())).toBe(true);
    });

    it('is false when there is no profile', async () => {
      const { core, service } = setup();
      core.userProfile.getUserProfile$.mockReturnValue(of(null));

      expect(await firstValueFrom(service.getCanWrite$())).toBe(false);
    });
  });

  describe('savePreset', () => {
    it('persists a new preset', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(storedPresets([]));
      const preset: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };

      await expect(service.savePreset(preset)).resolves.toBe('saved');
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([preset])
      );
    });

    it('prepends a new preset so the newest is stored first', async () => {
      const { core, service } = setup();
      const existing: PresetItem = { start: 'now-2h', end: 'now', label: 'Last 2 hours' };
      core.userStorage.peek.mockReturnValue(storedPresets([existing]));
      const preset: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };

      await service.savePreset(preset);
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([preset, existing])
      );
    });

    it('does not persist a preset that duplicates an existing start/end', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(storedPresets([{ start: 'now-1h', end: 'now' }]));

      await expect(
        service.savePreset({ start: 'now-1h', end: 'now', label: 'ignored' })
      ).resolves.toBe('duplicate');
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });

    it('does not persist a preset that duplicates a quick range', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(storedPresets([]));

      await expect(service.savePreset({ start: 'now/d', end: 'now/d' })).resolves.toBe('duplicate');
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });

    it('does not persist beyond MAX_PRESETS user presets', async () => {
      const { core, service } = setup();
      const full = Array.from({ length: MAX_PRESETS }, (_, i) => ({
        start: `now-${i}m`,
        end: 'now',
      }));
      core.userStorage.peek.mockReturnValue(storedPresets(full));

      await expect(service.savePreset({ start: 'now-999d', end: 'now' })).resolves.toBe(
        'limit-reached'
      );
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });

    it('does not count the quick ranges towards MAX_PRESETS', async () => {
      const { core, service } = setup();
      const nearlyFull = Array.from({ length: MAX_PRESETS - 1 }, (_, i) => ({
        start: `now-${i}m`,
        end: 'now',
      }));
      core.userStorage.peek.mockReturnValue(storedPresets(nearlyFull));

      await expect(service.savePreset({ start: 'now-999d', end: 'now' })).resolves.toBe('saved');
    });

    it('starts from an empty list when nothing is stored yet', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(DEFAULT_STORED_PRESETS);
      const preset: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };

      await expect(service.savePreset(preset)).resolves.toBe('saved');
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([preset])
      );
    });

    it('does not persist the isDeletable flag', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(storedPresets([]));

      await service.savePreset({ start: 'now-1h', end: 'now', isDeletable: true });
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([{ start: 'now-1h', end: 'now' }])
      );
    });
  });

  describe('deletePreset', () => {
    it('removes the preset matching the given start/end', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(
        storedPresets([
          { start: 'now-1h', end: 'now', label: 'Last hour' },
          { start: 'now-2h', end: 'now' },
        ])
      );

      await service.deletePreset({ start: 'now-1h', end: 'now' });
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([{ start: 'now-2h', end: 'now' }])
      );
    });

    it('does not write when asked to remove a quick range', async () => {
      const { core, service } = setup();
      core.userStorage.peek.mockReturnValue(storedPresets([{ start: 'now-1h', end: 'now' }]));

      await service.deletePreset({ start: 'now/d', end: 'now/d', label: 'Today' });
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });
  });
});
