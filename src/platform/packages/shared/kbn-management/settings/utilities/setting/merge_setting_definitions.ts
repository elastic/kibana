/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UiSettingsParams,
  UiSettingsRuntimeEntry,
  UserProvidedValues,
} from '@kbn/core-ui-settings-common';

type SettingDefinitions = Record<string, Omit<UiSettingsParams, 'schema'> & UserProvidedValues>;
type RuntimeSettings = Record<string, UiSettingsRuntimeEntry & UserProvidedValues>;

/**
 * Overlays the current values from a UI settings client's runtime state onto full setting
 * definitions, which provide the display metadata such as `description` and `options`.
 */
export const mergeSettingDefinitions = (
  definitions: Readonly<SettingDefinitions>,
  runtimeSettings: Readonly<RuntimeSettings>
): SettingDefinitions =>
  Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => {
      const runtimeSetting = runtimeSettings[id];

      if (!runtimeSetting) {
        return [id, definition];
      }

      const { userValue, isOverridden, ...displayMetadata } = definition;
      return [id, { ...displayMetadata, ...runtimeSetting }];
    })
  );
