/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import type { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import type { InternalUiSettingsServiceStart } from '@kbn/core-ui-settings-server-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

/** @public */
export interface CustomBrandingStart {}

export interface CustomBrandingStartDeps {
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
}

/** @public */
export interface CustomBrandingSetup {
  register: () => void;
  getBrandingFor: (request: KibanaRequest) => Promise<CustomBranding>;
}
