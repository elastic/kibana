/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_ID } from '@kbn/management-settings-ids';
import { ENABLE_DOCKED_CONSOLE_UI_SETTING_ID } from '@kbn/dev-tools-plugin/common';

export const SEARCH_PROJECT_SETTINGS = [
  COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_ID,
  ENABLE_DOCKED_CONSOLE_UI_SETTING_ID,
];
