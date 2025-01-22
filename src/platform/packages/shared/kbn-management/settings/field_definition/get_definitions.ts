/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { FieldDefinition, UiSettingMetadata } from '@kbn/management-settings-types';
import { getFieldDefinition } from './get_definition';

type SettingsClient = Pick<IUiSettingsClient, 'isCustom' | 'isOverridden'>;

/**
 * Convenience function to convert settings taken from a UiSettingsClient into
 * {@link FieldDefinition} objects.
 *
 * @param settings The settings retreived from the UiSettingsClient.
 * @param client The client itself, used to determine if a setting is custom or overridden.
 * @returns An array of {@link FieldDefinition} objects.
 */
export const getFieldDefinitions = (
  settings: Record<string, UiSettingMetadata>,
  client: SettingsClient
): FieldDefinition[] =>
  Object.entries(settings).map(([id, setting]) =>
    getFieldDefinition({
      id,
      setting,
      params: { isCustom: client.isCustom(id), isOverridden: client.isOverridden(id) },
    })
  );
