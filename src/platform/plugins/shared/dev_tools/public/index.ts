/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: https://github.com/elastic/kibana/issues/110892

import { DevToolsPlugin } from './plugin';
export type { DevToolsSetup } from './plugin';
export { DevToolsPlugin } from './plugin';
export { DEV_TOOLS_FEATURE_ID, ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID } from '../common/constants';

export function plugin() {
  return new DevToolsPlugin();
}
