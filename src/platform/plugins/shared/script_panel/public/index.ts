/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';

import { ScriptPanelPlugin } from './plugin';

export { SCRIPT_PANEL_EMBEDDABLE_TYPE } from '../common/constants';
export type { ScriptPanelApi, HasBrowserTools } from './types';
export type { ScriptPanelBrowserToolDefinition } from './browser_tools';
export { createScriptPanelBrowserTools } from './browser_tools';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ScriptPanelPlugin();
}
