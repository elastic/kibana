/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomBrandingStart {}
export interface CustomBrandingStartDeps {
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
}
/** @public */
export interface CustomBrandingSetup {
  register: () => void;
  setUiSettingsKeys: (uiSettingsKeys: string[]) => void;
}
