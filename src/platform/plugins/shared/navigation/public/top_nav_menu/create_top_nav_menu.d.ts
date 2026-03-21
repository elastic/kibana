import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { TopNavMenuProps } from './top_nav_menu';
import type { RegisteredTopNavMenuData } from './top_nav_menu_data';
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export declare function createTopNav(
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
unifiedSearch: UnifiedSearchPublicPluginStart, 
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
extraConfig: RegisteredTopNavMenuData[]): <QT extends AggregateQuery | Query = Query>(props: TopNavMenuProps<QT>) => React.JSX.Element;
