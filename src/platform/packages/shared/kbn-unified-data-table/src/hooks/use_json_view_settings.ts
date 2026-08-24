/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useMemo } from 'react';
import type { JsonModeSettings, SourceDisplayMode } from '../types';

const SOURCE_DISPLAY_MODE_STORAGE_KEY = 'sourceDisplayMode';
const JSON_MODE_SETTINGS_STORAGE_KEY = 'jsonModeSettings';
const getStorageKey = (consumer: string, key: string) => `${consumer}:${key}`;

const EMPTY_JSON_MODE_SETTINGS: JsonModeSettings = {};

interface UseSourceDisplayModeProps {
  storage: Storage;
  consumer: string;
  sourceDisplayModeState?: SourceDisplayMode;
  onUpdateSourceDisplayMode?: (sourceDisplayMode: SourceDisplayMode) => void;
}

export const useSourceDisplayMode = ({
  storage,
  consumer,
  sourceDisplayModeState,
  onUpdateSourceDisplayMode,
}: UseSourceDisplayModeProps) => {
  // Resolve to the per-context value or the safe "summary" default. Local storage is intentionally
  // not read here: it only seeds new authoring contexts (see getStoredSourceDisplayMode usages), so
  // that objects saved without an explicit mode keep rendering as "Table" instead of following the
  // viewer's last-used mode.
  const sourceDisplayMode = useMemo<SourceDisplayMode>(
    () => sourceDisplayModeState ?? 'summary',
    [sourceDisplayModeState]
  );

  const onChangeSourceDisplayMode = useMemo(
    () =>
      onUpdateSourceDisplayMode
        ? (newSourceDisplayMode: SourceDisplayMode) => {
            storage.set(
              getStorageKey(consumer, SOURCE_DISPLAY_MODE_STORAGE_KEY),
              newSourceDisplayMode
            );
            onUpdateSourceDisplayMode(newSourceDisplayMode);
          }
        : undefined,
    [storage, consumer, onUpdateSourceDisplayMode]
  );

  return { sourceDisplayMode, onChangeSourceDisplayMode };
};

interface UseJsonModeSettingsProps {
  storage: Storage;
  consumer: string;
  jsonModeSettingsState?: JsonModeSettings;
  onUpdateJsonModeSettings?: (jsonModeSettings: JsonModeSettings) => void;
}

export const useJsonModeSettings = ({
  storage,
  consumer,
  jsonModeSettingsState,
  onUpdateJsonModeSettings,
}: UseJsonModeSettingsProps) => {
  // Unlike sourceDisplayMode, these are cosmetic "how it looks" preferences (like density), so they
  // fall back to the viewer's last-used value from local storage when no per-context state is set.
  const jsonModeSettings = useMemo<JsonModeSettings>(
    () => jsonModeSettingsState ?? getJsonModeSettings(storage, consumer),
    [jsonModeSettingsState, storage, consumer]
  );

  const onChangeJsonModeSettings = useMemo(
    () =>
      onUpdateJsonModeSettings
        ? (newJsonModeSettings: JsonModeSettings) => {
            storage.set(
              getStorageKey(consumer, JSON_MODE_SETTINGS_STORAGE_KEY),
              newJsonModeSettings
            );
            onUpdateJsonModeSettings(newJsonModeSettings);
          }
        : undefined,
    [storage, consumer, onUpdateJsonModeSettings]
  );

  return { jsonModeSettings, onChangeJsonModeSettings };
};

export const getSourceDisplayMode = (storage: Storage, consumer: string): SourceDisplayMode => {
  const stored = storage.get(getStorageKey(consumer, SOURCE_DISPLAY_MODE_STORAGE_KEY));
  return stored === 'json' ? 'json' : 'summary';
};

const isJsonModeSettings = (value: unknown): value is JsonModeSettings =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getJsonModeSettings = (storage: Storage, consumer: string): JsonModeSettings => {
  const stored = storage.get(getStorageKey(consumer, JSON_MODE_SETTINGS_STORAGE_KEY));
  return isJsonModeSettings(stored) ? stored : EMPTY_JSON_MODE_SETTINGS;
};
