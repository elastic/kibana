/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import './index.scss';
import { NavigationPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new NavigationPublicPlugin(initializerContext);
}

export { TopNavMenu, TopNavMenuData, TopNavMenuProps } from './top_nav_menu';
export { NavigationPublicPluginSetup, NavigationPublicPluginStart } from './types';
// Export plugin after all other imports
export { NavigationPublicPlugin as Plugin };
