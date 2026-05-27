/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
export function plugin(initializerContext: PluginInitializerContext) {
  return new NavigationPublicPlugin(initializerContext);
}

export type { TopNavMenuData, TopNavMenuProps, TopNavMenuBadgeProps } from './top_nav_menu';
export { TopNavMenu, TopNavMenuItems, TopNavMenuBadges } from './top_nav_menu';

export type {
  NavigationPublicSetup as NavigationPublicPluginSetup,
  NavigationPublicStart as NavigationPublicPluginStart,
  SolutionType,
  AddSolutionNavigationArg,
  ExtensionPointRenderersFor,
  SecondaryNavExtensionPointContext,
} from './types';
export type { ExtractExtensionPointIds } from './extension_point_ids';
export { defineExtensionPointRenderers } from './define_extension_point_renderers';

export { AGENT_BUILDER_NAV_AT_TOP_FLAG } from '../common';

// Export plugin after all other imports
import { NavigationPublicPlugin } from './plugin';
export { NavigationPublicPlugin as Plugin };
