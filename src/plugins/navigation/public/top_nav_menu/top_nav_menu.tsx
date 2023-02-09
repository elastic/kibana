/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { EuiBadge, EuiBadgeGroup, EuiBadgeProps, EuiHeaderLinks } from '@elastic/eui';
import classNames from 'classnames';

import { MountPoint } from '@kbn/core/public';
import { MountPointPortal } from '@kbn/kibana-react-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { StatefulSearchBarProps, SearchBarProps } from '@kbn/unified-search-plugin/public';
import { AggregateQuery, Query } from '@kbn/es-query';
import { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

export type TopNavMenuProps<QT extends Query | AggregateQuery = Query> =
  StatefulSearchBarProps<QT> &
    Omit<SearchBarProps<QT>, 'kibana' | 'intl' | 'timeHistory'> & {
      config?: TopNavMenuData[];
      badges?: Array<EuiBadgeProps & { badgeText: string }>;
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
    if (!badges || badges.length === 0) return null;
    return (
      <EuiBadgeGroup className={'kbnTopNavMenu__badgeGroup'}>
        {badges.map((badge: EuiBadgeProps & { badgeText: string }, i: number) => {
          const { badgeText, ...badgeProps } = badge;
          return (
            <EuiBadge key={`nav-menu-badge-${i}`} {...badgeProps}>
              {badgeText}
            </EuiBadge>
          );
        })}
      </EuiBadgeGroup>
    );
  }

  function renderItems(): ReactElement[] | null {
    if (!config || config.length === 0) return null;
    return config.map((menuItem: TopNavMenuData, i: number) => {
      return <TopNavMenuItem key={`nav-menu-${i}`} {...menuItem} />;
    });
  }

  function renderMenu(className: string): ReactElement | null {
    if (!config || config.length === 0) return null;
    return (
      <EuiHeaderLinks data-test-subj="top-nav" gutterSize="xs" className={className}>
        {renderItems()}
      </EuiHeaderLinks>
    );
  }

  function renderSearchBar(): ReactElement | null {
    // Validate presense of all required fields
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
      return (
        <>
          <MountPointPortal setMountPoint={setMenuMountPoint}>
            <span className={`${wrapperClassName} kbnTopNavMenu__badgeWrapper`}>
              {renderBadges()}
              {renderMenu(menuClassName)}
            </span>
          </MountPointPortal>
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
