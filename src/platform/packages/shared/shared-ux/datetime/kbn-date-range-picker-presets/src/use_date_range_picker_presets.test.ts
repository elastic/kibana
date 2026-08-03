/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type {
  DateRangePickerPresetsService,
  PresetItem,
  SavePresetOutcome,
} from '@kbn/date-range-picker-presets-common';

import { useDateRangePickerPresets } from './use_date_range_picker_presets';

const defaultPresets: PresetItem[] = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
];

const createServiceMock = (
  overrides: Partial<jest.Mocked<DateRangePickerPresetsService>> = {}
): jest.Mocked<DateRangePickerPresetsService> => ({
  getDefaultPresets: jest.fn(() => defaultPresets),
  getPresets$: jest.fn(() => of(defaultPresets)),
  getCanWrite$: jest.fn(() => of(true)),
  savePreset: jest.fn<Promise<SavePresetOutcome>, [PresetItem]>().mockResolvedValue('saved'),
  deletePreset: jest.fn<Promise<void>, [PresetItem]>().mockResolvedValue(undefined),
  ...overrides,
});

const createNotifications = (): NotificationsStart =>
  ({
    toasts: {
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    },
  } as unknown as NotificationsStart);

const renderPresetsHook = ({
  service = createServiceMock(),
  persistenceEnabled = true,
  notifications = createNotifications(),
}: {
  service?: jest.Mocked<DateRangePickerPresetsService>;
  persistenceEnabled?: boolean;
  notifications?: NotificationsStart;
} = {}) => {
  const hook = renderHook(() =>
    useDateRangePickerPresets({ service, persistenceEnabled, notifications })
  );
  return { hook, service, notifications };
};

describe('useDateRangePickerPresets', () => {
  describe('when enabled', () => {
    it('returns the resolved presets from the service', async () => {
      const stored: PresetItem[] = [{ start: 'now-1h', end: 'now', label: 'Last hour' }];
      const service = createServiceMock({ getPresets$: jest.fn(() => of(stored)) });
      const { hook } = renderPresetsHook({ service });

      await waitFor(() => expect(hook.result.current.presets).toEqual(stored));
    });

    it('exposes save/delete handlers when the user can write', async () => {
      const { hook } = renderPresetsHook();

      await waitFor(() => {
        expect(hook.result.current.onPresetSave).toBeDefined();
        expect(hook.result.current.onPresetDelete).toBeDefined();
      });
    });

    it('omits save/delete handlers when the user cannot write', () => {
      const service = createServiceMock({ getCanWrite$: jest.fn(() => of(false)) });
      const { hook } = renderPresetsHook({ service });

      expect(hook.result.current.onPresetSave).toBeUndefined();
      expect(hook.result.current.onPresetDelete).toBeUndefined();
    });

    it('delegates save to the service', async () => {
      const { hook, service } = renderPresetsHook();
      await waitFor(() => expect(hook.result.current.onPresetSave).toBeDefined());

      const preset: PresetItem = { start: 'now-1h', end: 'now' };
      act(() => hook.result.current.onPresetSave!(preset));

      expect(service.savePreset).toHaveBeenCalledWith(preset);
    });

    it('warns when the preset limit is reached', async () => {
      const service = createServiceMock({
        savePreset: jest
          .fn<Promise<SavePresetOutcome>, [PresetItem]>()
          .mockResolvedValue('limit-reached'),
      });
      const { hook, notifications } = renderPresetsHook({ service });
      await waitFor(() => expect(hook.result.current.onPresetSave).toBeDefined());

      act(() => hook.result.current.onPresetSave!({ start: 'now-1h', end: 'now' }));

      await waitFor(() => expect(notifications.toasts.addWarning).toHaveBeenCalled());
      expect(notifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('shows a danger toast when saving fails', async () => {
      const service = createServiceMock({
        savePreset: jest
          .fn<Promise<SavePresetOutcome>, [PresetItem]>()
          .mockRejectedValue(new Error('boom')),
      });
      const { hook, notifications } = renderPresetsHook({ service });
      await waitFor(() => expect(hook.result.current.onPresetSave).toBeDefined());

      act(() => hook.result.current.onPresetSave!({ start: 'now-1h', end: 'now' }));

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());
    });

    it('delegates delete to the service', async () => {
      const { hook, service } = renderPresetsHook();
      await waitFor(() => expect(hook.result.current.onPresetDelete).toBeDefined());

      const preset: PresetItem = { start: 'now-1h', end: 'now' };
      act(() => hook.result.current.onPresetDelete!(preset));

      expect(service.deletePreset).toHaveBeenCalledWith(preset);
    });

    it('shows a danger toast when deleting fails', async () => {
      const service = createServiceMock({
        deletePreset: jest.fn<Promise<void>, [PresetItem]>().mockRejectedValue(new Error('boom')),
      });
      const { hook, notifications } = renderPresetsHook({ service });
      await waitFor(() => expect(hook.result.current.onPresetDelete).toBeDefined());

      act(() => hook.result.current.onPresetDelete!({ start: 'now-1h', end: 'now' }));

      await waitFor(() => expect(notifications.toasts.addDanger).toHaveBeenCalled());
    });
  });

  describe('when disabled', () => {
    it('returns the default presets without reading stored presets', () => {
      const service = createServiceMock();
      const { hook } = renderPresetsHook({ service, persistenceEnabled: false });

      expect(hook.result.current.presets).toEqual(defaultPresets);
      expect(service.getPresets$).not.toHaveBeenCalled();
    });

    it('omits save/delete handlers and skips the canWrite check', () => {
      const service = createServiceMock();
      const { hook } = renderPresetsHook({ service, persistenceEnabled: false });

      expect(hook.result.current.onPresetSave).toBeUndefined();
      expect(hook.result.current.onPresetDelete).toBeUndefined();
      expect(service.getCanWrite$).not.toHaveBeenCalled();
    });
  });
});
