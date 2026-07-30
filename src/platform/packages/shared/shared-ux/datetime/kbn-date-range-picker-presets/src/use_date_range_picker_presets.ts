/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { of } from 'rxjs';

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { useObservable } from '@kbn/use-observable';

import type {
  DateRangePickerPresetsService,
  PresetItem,
} from '@kbn/date-range-picker-presets-common';

export interface UseDateRangePickerPresetsArgs {
  /**
   * Storage-agnostic presets service (e.g. `data.dateRangePickerPresets`). Owns
   * the persistence mechanism and the dedupe/cap rules; this hook only adapts it
   * to the picker props and surfaces failures as toasts.
   */
  service: DateRangePickerPresetsService;
  /**
   * When `false`, presets are the read-only quick-ranges defaults: no stored
   * value is read and save/delete are unavailable. Consumers gate this on their
   * persistence feature flag.
   */
  persistenceEnabled: boolean;
  notifications: NotificationsStart;
}

export interface UseDateRangePickerPresetsResult {
  presets: PresetItem[];
  onPresetSave?: (option: PresetItem) => void;
  onPresetDelete?: (option: PresetItem) => void;
}

export const useDateRangePickerPresets = ({
  service,
  persistenceEnabled,
  notifications,
}: UseDateRangePickerPresetsArgs): UseDateRangePickerPresetsResult => {
  const defaultPresets = useMemo(() => service.getDefaultPresets(), [service]);

  const presets$ = useMemo(
    () => (persistenceEnabled ? service.getPresets$() : of(defaultPresets)),
    [persistenceEnabled, service, defaultPresets]
  );
  const presets = useObservable(presets$, defaultPresets);

  const canWrite$ = useMemo(
    () => (persistenceEnabled ? service.getCanWrite$() : of(false)),
    [persistenceEnabled, service]
  );
  const canWrite = useObservable(canWrite$, false);

  const notifyPersistFailure = useCallback(() => {
    notifications.toasts.addDanger(
      i18n.translate('sharedUXPackages.dateRangePickerPresets.persistFailureErrorMessage', {
        defaultMessage: 'Unable to update date range presets.',
      })
    );
  }, [notifications.toasts]);

  const onPresetSave = useMemo(() => {
    if (!canWrite) {
      return undefined;
    }

    return (option: PresetItem) => {
      void service.savePreset(option).then((outcome) => {
        if (outcome === 'limit-reached') {
          notifications.toasts.addWarning(
            i18n.translate(
              'sharedUXPackages.dateRangePickerPresets.maximumPresetsReachedErrorMessage',
              {
                defaultMessage: 'Maximum of 40 date range presets reached.',
              }
            )
          );
        }
      }, notifyPersistFailure);
    };
  }, [canWrite, service, notifications.toasts, notifyPersistFailure]);

  const onPresetDelete = useMemo(() => {
    if (!canWrite) {
      return undefined;
    }

    return (option: PresetItem) => {
      void service.deletePreset(option).catch(notifyPersistFailure);
    };
  }, [canWrite, service, notifyPersistFailure]);

  return {
    presets,
    onPresetSave,
    onPresetDelete,
  };
};
