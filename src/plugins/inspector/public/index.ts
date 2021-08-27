/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import './index.scss';
import { InspectorPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new InspectorPublicPlugin(initializerContext);
}

export * from '../common/adapters';
export { InspectorPublicPlugin as Plugin, Setup, Start } from './plugin';
export * from './types';
