/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { getFieldDefinitions } from '@kbn/management-settings-field-definition';
import { FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { useSettings } from './use_settings';

/**
 * React hook which retrieves settings from a particular {@link IUiSettingsClient},
 * and returns an observed collection of {@link FieldDefinition} objects derived from
 * those settings.
 */
export const useFields = (client: IUiSettingsClient): Array<FieldDefinition<SettingType>> => {
  const settings = useSettings(client);
  return getFieldDefinitions(settings, client);
};
