/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_TILE_API_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_ROADMAP_ID,
  DEFAULT_EMS_ROADMAP_DESATURATED_ID,
  DEFAULT_EMS_DARKMAP_ID,
  DEFAULT_EMS_REST_VERSION,
  EMS_APP_NAME,
  // these two variables should not be exported after Borealis is the only theme
  EMS_DARKMAP_BOREALIS_ID,
  EMS_ROADMAP_BOREALIS_DESATURATED_ID,
} from './ems_defaults';

export { EMSSettings } from './ems_settings';
export type { EMSConfig } from './ems_settings';

export const LICENSE_CHECK_ID = 'maps';
