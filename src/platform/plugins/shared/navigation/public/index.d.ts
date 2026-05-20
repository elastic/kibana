import type { PluginInitializerContext } from '@kbn/core/public';
export declare function plugin(initializerContext: PluginInitializerContext): NavigationPublicPlugin;
export type { TopNavMenuData, TopNavMenuProps, TopNavMenuBadgeProps } from './top_nav_menu';
export { TopNavMenu, TopNavMenuItems, TopNavMenuBadges } from './top_nav_menu';
export type { NavigationPublicSetup as NavigationPublicPluginSetup, NavigationPublicStart as NavigationPublicPluginStart, SolutionType, AddSolutionNavigationArg, } from './types';
import { NavigationPublicPlugin } from './plugin';
export { NavigationPublicPlugin as Plugin };
