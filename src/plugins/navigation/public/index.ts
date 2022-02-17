/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';
export function plugin(initializerContext: PluginInitializerContext) {
  return new NavigationPublicPlugin(initializerContext);
}

export type { TopNavMenuData, TopNavMenuProps } from './top_nav_menu';
export { TopNavMenu } from './top_nav_menu';

export type { NavigationPublicPluginSetup, NavigationPublicPluginStart } from './types';

// Export plugin after all other imports
import { NavigationPublicPlugin } from './plugin';
export { NavigationPublicPlugin as Plugin };
