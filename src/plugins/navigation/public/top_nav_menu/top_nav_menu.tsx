/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import classNames from 'classnames';

import { MountPoint } from '@kbn/core/public';
import { MountPointPortal } from '@kbn/react-kibana-mount';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { AggregateQuery, Query } from '@kbn/es-query';
import { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItems } from './top_nav_menu_items';
import { TopNavMenuBadgeProps, TopNavMenuBadges } from './top_nav_menu_badges';

export type TopNavMenuProps<QT extends Query | AggregateQuery = Query> = Omit<
  StatefulSearchBarProps<QT>,
  'kibana' | 'intl' | 'timeHistory'
> & {
  config?: TopNavMenuData[];
  badges?: TopNavMenuBadgeProps[];
  showSearchBar?: boolean;
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  showFilterBar?: boolean;
  unifiedSearch?: UnifiedSearchPublicPluginStart;
  className?: string;
  visible?: boolean;
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
};

/*
 * Top Nav Menu is a convenience wrapper component for:
 * - Top navigation menu - configured by an array of `TopNavMenuData` objects
 * - Search Bar - which includes Filter Bar \ Query Input \ Timepicker.
 *
 * See SearchBar documentation to learn more about its properties.
 *
 **/

export function TopNavMenu<QT extends AggregateQuery | Query = Query>(
  props: TopNavMenuProps<QT>
): ReactElement | null {
  const { config, badges, showSearchBar, ...searchBarProps } = props;

  if ((!config || config.length === 0) && (!showSearchBar || !props.unifiedSearch)) {
    return null;
  }

  function renderBadges(): ReactElement | null {
    return <TopNavMenuBadges badges={badges} />;
  }

  function renderMenu(className: string): ReactElement | null {
    return <TopNavMenuItems config={config} className={className} />;
  }

  function renderSearchBar(): ReactElement | null {
    // Validate presence of all required fields
    if (!showSearchBar || !props.unifiedSearch) return null;
    const { AggregateQuerySearchBar } = props.unifiedSearch.ui;
    return <AggregateQuerySearchBar<QT> {...searchBarProps} />;
  }

  function renderLayout() {
    const { setMenuMountPoint, visible } = props;
    const menuClassName = classNames('kbnTopNavMenu', props.className);
    const wrapperClassName = classNames('kbnTopNavMenu__wrapper', {
      'kbnTopNavMenu__wrapper--hidden': visible === false,
    });
    if (setMenuMountPoint) {
      const badgesEl = renderBadges();
      const menuEl = renderMenu(menuClassName);
      return (
        <>
          {(badgesEl || menuEl) && (
            <MountPointPortal setMountPoint={setMenuMountPoint}>
              <span className={`${wrapperClassName} kbnTopNavMenu__badgeWrapper`}>
                {badgesEl}
                {menuEl}
              </span>
            </MountPointPortal>
          )}

          {renderSearchBar()}
        </>
      );
    } else {
      return (
        <>
          <span className={wrapperClassName}>{renderMenu(menuClassName)}</span>
          {renderSearchBar()}
        </>
      );
    }
  }

  return renderLayout();
}

TopNavMenu.defaultProps = {
  showSearchBar: false,
  showQueryInput: true,
  showDatePicker: true,
  showFilterBar: true,
  screenTitle: '',
};
