/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty, keyBy, pick, pickBy } from 'lodash';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import type {
  FieldDefinition,
  OnFieldChangeFn,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { normalizeSettings } from '@kbn/management-settings-utilities';

export interface UseEditableSettingsParams {
  /** The IDs of the settings to edit. */
  settingsKeys: readonly string[];
  /** The client the settings are read from and saved to. */
  settingsClient: IUiSettingsClient;
}

export interface SaveAllResult {
  /**
   * True if a setting saved by this call, or by an earlier call that rejected, requires a page
   * reload.
   */
  requiresReload: boolean;
}

export interface UseEditableSettingsResult {
  /** Field definitions for the requested settings that are registered, keyed by setting ID. */
  fields: Record<string, FieldDefinition>;
  unsavedChanges: Record<string, UnsavedFieldChange>;
  handleFieldChange: OnFieldChangeFn;
  cleanUnsavedChanges: () => void;
  /**
   * Saves every unsaved change, and rejects with the combined messages if any update fails.
   * Changes that saved are cleared; changes that failed stay unsaved so they can be retried.
   */
  saveAll: () => Promise<SaveAllResult>;
  isSaving: boolean;
}

const getSettingsFields = (
  settingsKeys: readonly string[],
  settingsClient: IUiSettingsClient
): Record<string, FieldDefinition> =>
  keyBy(
    getFieldDefinitions(
      pick(normalizeSettings(settingsClient.getAll()), settingsKeys),
      settingsClient
    ),
    'id'
  );

/**
 * React hook for editing a fixed list of UI settings: their field definitions, unsaved changes, and saving.
 */
export const useEditableSettings = ({
  settingsKeys,
  settingsClient,
}: UseEditableSettingsParams): UseEditableSettingsResult => {
  // Callers often build the keys array inline, so key the memo on its contents.
  const settingsKeysJson = JSON.stringify(settingsKeys);
  const trackedKeys = useMemo<string[]>(() => JSON.parse(settingsKeysJson), [settingsKeysJson]);

  const [settingsVersion, setSettingsVersion] = useState(0);
  const [allUnsavedChanges, setUnsavedChanges] = useState<Record<string, UnsavedFieldChange>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const subscription = settingsClient.getUpdate$().subscribe(({ key }) => {
      if (trackedKeys.includes(key)) {
        setSettingsVersion((version) => version + 1);
      }
    });

    return () => subscription.unsubscribe();
  }, [settingsClient, trackedKeys]);

  const fields = useMemo(
    () => getSettingsFields(trackedKeys, settingsClient),
    // The client is mutable, so `settingsVersion` stands in for its tracked values changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackedKeys, settingsClient, settingsVersion]
  );

  // A change to a key that is no longer tracked is hidden from the form, so it must not be saved.
  const unsavedChanges = useMemo(
    () => pickBy(allUnsavedChanges, (_change, id) => trackedKeys.includes(id)),
    [allUnsavedChanges, trackedKeys]
  );

  const handleFieldChange = useCallback<OnFieldChangeFn>((id, change) => {
    if (!change) {
      setUnsavedChanges(({ [id]: _removed, ...rest }) => rest);
      return;
    }
    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  }, []);

  const cleanUnsavedChanges = useCallback(() => setUnsavedChanges({}), []);

  // A reload-required change can save in a call that then rejects, so the reload is reported by
  // the next call that resolves.
  const pendingReloadRef = useRef(false);
  const takePendingReload = useCallback(() => {
    const requiresReload = pendingReloadRef.current;
    pendingReloadRef.current = false;
    return requiresReload;
  }, []);

  const saveAll = useCallback(async (): Promise<SaveAllResult> => {
    if (isEmpty(unsavedChanges)) {
      return { requiresReload: takePendingReload() };
    }

    // A request failure resolves `set` to false and puts the server's message on this stream.
    // The stream is client-wide, so it only supplies messages; the return values decide what failed.
    const updateErrors: Error[] = [];
    const subscription = settingsClient
      .getUpdateErrors$()
      .subscribe((error) => updateErrors.push(error));

    const changes = Object.entries(unsavedChanges);
    let results: Array<PromiseSettledResult<boolean>>;
    setIsSaving(true);
    try {
      // A readonly or overridden key makes `set` reject, which must not abandon the other keys.
      results = await Promise.allSettled(
        changes.map(([id, { unsavedValue }]) => settingsClient.set(id, unsavedValue))
      );
    } finally {
      subscription.unsubscribe();
      setIsSaving(false);
    }

    const savedChanges = new Map<string, UnsavedFieldChange>();
    const rejectionMessages: string[] = [];
    const unconfirmedIds: string[] = [];
    results.forEach((result, index) => {
      const [id, change] = changes[index];
      if (result.status === 'rejected') {
        rejectionMessages.push(result.reason?.message ?? String(result.reason));
      } else if (result.value === false) {
        unconfirmedIds.push(id);
      } else {
        savedChanges.set(id, change);
        if (fields[id]?.requiresPageReload) {
          pendingReloadRef.current = true;
        }
      }
    });

    // Keeps failed changes for a retry, and any change the user made while the save was in flight.
    setUnsavedChanges((current) => {
      const remaining = { ...current };
      savedChanges.forEach((change, id) => {
        if (remaining[id] === change) {
          delete remaining[id];
        }
      });
      return remaining;
    });

    const failureMessages = [...rejectionMessages];
    if (unconfirmedIds.length > 0) {
      if (updateErrors.length > 0) {
        failureMessages.push(...updateErrors.map(({ message }) => message));
      } else {
        failureMessages.push(
          ...unconfirmedIds.map((id) =>
            i18n.translate('management.settings.hooks.saveFailed', {
              defaultMessage: 'Unable to save "{name}"',
              values: { name: fields[id]?.name ?? id },
            })
          )
        );
      }
    }
    if (failureMessages.length > 0) {
      // The client batches queued updates, and every key in a failed batch reports the same error.
      throw new Error([...new Set(failureMessages)].join('; '));
    }

    return { requiresReload: takePendingReload() };
  }, [fields, settingsClient, unsavedChanges, takePendingReload]);

  return {
    fields,
    unsavedChanges,
    handleFieldChange,
    cleanUnsavedChanges,
    saveAll,
    isSaving,
  };
};
