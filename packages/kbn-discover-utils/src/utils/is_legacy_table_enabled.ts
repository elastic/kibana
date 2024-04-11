/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DOC_TABLE_LEGACY } from '../constants';

export function isLegacyTableEnabled({
  uiSettings,
  isTextBasedQueryMode,
}: {
  uiSettings: IUiSettingsClient;
  isTextBasedQueryMode: boolean;
}): boolean {
  if (isTextBasedQueryMode) {
    return false; // only show the new data grid
  }

  return uiSettings.get(DOC_TABLE_LEGACY);
}
