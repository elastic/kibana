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

const setup = () => {
  const core = coreMock.createStart();
  core.uiSettings.get.mockImplementation((key: string) =>
    key === TIMEPICKER_QUICK_RANGES_SETTING ? quickRanges : undefined
  );

  const service = new DateRangePickerPresetsService({
    userStorage: core.userStorage,
    uiSettings: core.uiSettings,
  });

  return { core, service };
};

const storedPresets = (presets: PresetItem[] | null): StoredPresets => ({ version: 1, presets });

describe('DateRangePickerPresetsService', () => {
  describe('getDefaultPresets', () => {
    it('maps the configured quick ranges to presets', () => {
      const { service } = setup();
      expect(service.getDefaultPresets()).toEqual(quickRangePresets);
    });

    it('returns an empty list when no quick ranges are configured', () => {
      const { core, service } = setup();
      core.uiSettings.get.mockReturnValue(undefined);
      expect(service.getDefaultPresets()).toEqual([]);
    });
  });

  describe('getPresets$', () => {
    it('emits the stored presets when present', async () => {
      const { core, service } = setup();
      const stored: PresetItem[] = [{ start: 'now-1h', end: 'now', label: 'Last hour' }];
      core.userStorage.get$.mockReturnValue(of(storedPresets(stored)));

      expect(await firstValueFrom(service.getPresets$())).toEqual(stored);
    });

    it('falls back to the default presets when nothing is stored', async () => {
      const { core, service } = setup();
      core.userStorage.get$.mockReturnValue(of(DEFAULT_STORED_PRESETS));

      expect(await firstValueFrom(service.getPresets$())).toEqual(quickRangePresets);
    });
  });

  describe('canPersist', () => {
    it('delegates to userStorage.isAvailable()', () => {
      const { core, service } = setup();
      core.userStorage.isAvailable.mockReturnValue(true);

      expect(service.canPersist()).toBe(true);
      expect(core.userStorage.isAvailable).toHaveBeenCalled();
    });

    it('is false when userStorage reports it is unavailable (e.g. no profile)', () => {
      const { core, service } = setup();
      core.userStorage.isAvailable.mockReturnValue(false);

      expect(service.canPersist()).toBe(false);
    });
  });

  describe('savePreset', () => {
    it('persists a new preset appended to the stored presets', async () => {
      const { core, service } = setup();
      core.userStorage.get.mockResolvedValue(storedPresets([]));
      const preset: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };

      await expect(service.savePreset(preset)).resolves.toBe('saved');
      // Reads the resolved value as the write base, then persists.
      expect(core.userStorage.get).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        DEFAULT_STORED_PRESETS
      );
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([preset])
      );
    });

    it('does not persist a preset that duplicates an existing start/end', async () => {
      const { core, service } = setup();
      core.userStorage.get.mockResolvedValue(storedPresets([{ start: 'now-1h', end: 'now' }]));

      await expect(
        service.savePreset({ start: 'now-1h', end: 'now', label: 'ignored' })
      ).resolves.toBe('duplicate');
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });

    it('does not persist beyond MAX_PRESETS', async () => {
      const { core, service } = setup();
      const full = Array.from({ length: MAX_PRESETS }, (_, i) => ({
        start: `now-${i}m`,
        end: 'now',
      }));
      core.userStorage.get.mockResolvedValue(storedPresets(full));

      await expect(service.savePreset({ start: 'now-999d', end: 'now' })).resolves.toBe(
        'limit-reached'
      );
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });

    it('uses the default presets as the base when nothing is stored yet', async () => {
      const { core, service } = setup();
      core.userStorage.get.mockResolvedValue(DEFAULT_STORED_PRESETS);
      const preset: PresetItem = { start: 'now-1h', end: 'now', label: 'Last hour' };

      await expect(service.savePreset(preset)).resolves.toBe('saved');
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([...quickRangePresets, preset])
      );
    });

    it('reads the resolved (not unhydrated peek) value as the mutation base', async () => {
      const { core, service } = setup();
      const existing = storedPresets([{ start: 'now-1h', end: 'now', label: 'Existing' }]);
      let resolveGet: (value: StoredPresets) => void;
      core.userStorage.get.mockReturnValue(
        new Promise((resolve) => {
          resolveGet = resolve;
        })
      );

      const savePromise = service.savePreset({ start: 'now-2h', end: 'now', label: 'New' });
      resolveGet!(existing);

      await expect(savePromise).resolves.toBe('saved');
      expect(core.userStorage.peek).not.toHaveBeenCalled();
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([
          { start: 'now-1h', end: 'now', label: 'Existing' },
          { start: 'now-2h', end: 'now', label: 'New' },
        ])
      );
    });
  });

  describe('deletePreset', () => {
    it('removes the preset matching the given start/end', async () => {
      const { core, service } = setup();
      core.userStorage.get.mockResolvedValue(
        storedPresets([
          { start: 'now-1h', end: 'now', label: 'Last hour' },
          { start: 'now-2h', end: 'now' },
        ])
      );

      await service.deletePreset({ start: 'now-1h', end: 'now' });
      // Reads the resolved value as the write base, then persists.
      expect(core.userStorage.get).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        DEFAULT_STORED_PRESETS
      );
      expect(core.userStorage.set).toHaveBeenCalledWith(
        DATE_RANGE_PICKER_PRESETS_KEY,
        storedPresets([{ start: 'now-2h', end: 'now' }])
      );
    });

    it('no-ops when nothing matches the given start/end', async () => {
      const { core, service } = setup();
      core.userStorage.get.mockResolvedValue(storedPresets([{ start: 'now-1h', end: 'now' }]));

      await service.deletePreset({ start: 'now-999d', end: 'now' });
      expect(core.userStorage.set).not.toHaveBeenCalled();
    });
  });
});
