/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { ReactElement } from 'react';
import { EuiHeaderLinks } from '@elastic/eui';
import classNames from 'classnames';

import { MountPoint } from '../../../../core/public';
import { MountPointPortal } from '../../../kibana_react/public';
import {
  StatefulSearchBarProps,
  DataPublicPluginStart,
  SearchBarProps,
} from '../../../data/public';
import { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';

export type TopNavMenuProps = StatefulSearchBarProps &
  Omit<SearchBarProps, 'kibana' | 'intl' | 'timeHistory'> & {
    config?: TopNavMenuData[];
    showSearchBar?: boolean;
    showQueryBar?: boolean;
    showQueryInput?: boolean;
    showDatePicker?: boolean;
    showFilterBar?: boolean;
    data?: DataPublicPluginStart;
    className?: string;
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

export function TopNavMenu(props: TopNavMenuProps): ReactElement | null {
  const { config, showSearchBar, ...searchBarProps } = props;

  if ((!config || config.length === 0) && (!showSearchBar || !props.data)) {
    return null;
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
    if (!showSearchBar || !props.data) return null;
    const { SearchBar } = props.data.ui;
    return <SearchBar {...searchBarProps} />;
  }

  function renderLayout() {
    const { setMenuMountPoint } = props;
    const menuClassName = classNames('kbnTopNavMenu', props.className);
    const wrapperClassName = 'kbnTopNavMenu__wrapper';
    if (setMenuMountPoint) {
      return (
        <>
          <MountPointPortal setMountPoint={setMenuMountPoint}>
            <span className={wrapperClassName}>{renderMenu(menuClassName)}</span>
          </MountPointPortal>
          <span className={wrapperClassName}>{renderSearchBar()}</span>
        </>
      );
    } else {
      return (
        <span className={wrapperClassName}>
          {renderMenu(menuClassName)}
          {renderSearchBar()}
        </span>
      );
    }
  }

  return renderLayout();
}

TopNavMenu.defaultProps = {
  showSearchBar: false,
  showQueryBar: true,
  showQueryInput: true,
  showDatePicker: true,
  showFilterBar: true,
  screenTitle: '',
};
