/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '../../../common';

const defaultSessionId = `${Date.now()}`;

export function getEsPreference(uiSettings: IUiSettingsClient, sessionId = defaultSessionId) {
  const setPreference = uiSettings.get(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setPreference === 'sessionId') return `${sessionId}`;
  const customPreference = uiSettings.get(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE);
  return setPreference === 'custom' ? customPreference : undefined;
}
