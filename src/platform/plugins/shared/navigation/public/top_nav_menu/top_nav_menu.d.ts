import type { ReactElement } from 'react';
import type { MountPoint } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { EuiBreakpointSize, EuiHeaderLinksProps } from '@elastic/eui';
import type { TopNavMenuData } from './top_nav_menu_data';
import { type TopNavMenuBadgeProps } from './top_nav_menu_badges';
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export type TopNavMenuProps<QT extends Query | AggregateQuery = Query> = Omit<StatefulSearchBarProps<QT>, 'kibana' | 'intl' | 'timeHistory'> & {
    config?: TopNavMenuData[];
    /**
     * @deprecated Use coreStart.chrome.setBreadcrumbsBadges API instead
     */
    badges?: TopNavMenuBadgeProps[];
    showSearchBar?: boolean;
    showQueryInput?: boolean;
    showDatePicker?: boolean;
    showFilterBar?: boolean;
    unifiedSearch?: UnifiedSearchPublicPluginStart;
    className?: string;
    visible?: boolean;
    gutterSize?: EuiHeaderLinksProps['gutterSize'];
    /**
     * If provided, the menu part of the component will be rendered as a portal inside the given mount point.
     *
     * This is meant to be used with the `setHeaderActionMenu` core API.
     *
     * @example
     * ```ts
     * export renderApp = ({ element, history, setHeaderActionMenu }: AppMountParameters) => {
     *   const topNavConfig = ...; // TopNavMenuProps
     *   return (
     *     <Router history=history>
     *       <TopNavMenu {...topNavConfig} setMenuMountPoint={setHeaderActionMenu}>
     *       <MyRoutes />
     *     </Router>
     *   )
     * }
     * ```
     */
    setMenuMountPoint?: (menuMount: MountPoint | undefined) => void;
    /**
     * A list of named breakpoints at which to show the popover version. If not provided, it will use the default set of ['xs', 's'] that is internally provided by EUI.
     */
    popoverBreakpoints?: EuiBreakpointSize[];
};
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export declare function TopNavMenu<QT extends AggregateQuery | Query = Query>(props: TopNavMenuProps<QT>): ReactElement | null;
export declare namespace TopNavMenu {
    var defaultProps: {
        showSearchBar: boolean;
        showQueryInput: boolean;
        showDatePicker: boolean;
        showFilterBar: boolean;
        screenTitle: string;
    };
}
