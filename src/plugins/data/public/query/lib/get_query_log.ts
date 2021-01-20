/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { PersistedLog } from '../persisted_log';
import { UI_SETTINGS } from '../../../common';

/** @internal */
export function getQueryLog(
  uiSettings: IUiSettingsClient,
  storage: IStorageWrapper,
  appName: string,
  language: string
) {
  return new PersistedLog(
    `typeahead:${appName}-${language}`,
    {
      maxLength: uiSettings.get(UI_SETTINGS.HISTORY_LIMIT),
      filterDuplicates: true,
    },
    storage
  );
}
