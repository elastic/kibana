/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { ReactElement } from 'react';
import React from 'react';
import { MountPointPortal } from '@kbn/react-kibana-mount';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { TopNavMenuDataBeta } from '../top_nav_menu/top_nav_menu_data';
import type { TopNavMenuProps } from '../top_nav_menu/top_nav_menu';
import { TopNavMenuBadges } from '../top_nav_menu/top_nav_menu_badges';
import { TopNavMenuItemsBeta } from './top_nav_menu_items_beta';

export type TopNavMenuPropsBeta<QT extends Query | AggregateQuery = Query> = Omit<
  TopNavMenuProps<QT>,
  'config'
> & {
  config?: TopNavMenuDataBeta;
};

const styles = {
  badgeWrapper: css`
    display: flex;
    align-items: center;
  `,
  hidden: css`
    display: none;
  `,
};

export function TopNavMenuBeta<QT extends AggregateQuery | Query = Query>({
  config,
  badges,
  showSearchBar = false,
  showQueryInput = true,
  showDatePicker = true,
  showFilterBar = true,
  screenTitle = '',
  gutterSize,
  setMenuMountPoint,
  visible,
  unifiedSearch,
  className,
  popoverBreakpoints,
  ...searchBarProps
}: TopNavMenuPropsBeta<QT>): ReactElement | null {
  if ((!config || config.items.length === 0) && (!showSearchBar || !unifiedSearch)) {
    return null;
  }

  const badgesComponent = <TopNavMenuBadges badges={badges} />;
  const menuComponent = (
    <TopNavMenuItemsBeta
      config={config}
      className={className}
      data-test-subj="kbn-top-nav-menu-wrapper"
      css={css`
        button:last-child {
          margin-right: 0;
        }
      `}
      popoverBreakpoints={popoverBreakpoints}
      gutterSize={gutterSize}
    />
  );

  const renderSearchBar = (): ReactElement | null => {
    // Validate presence of all required fields
    if (!showSearchBar || !unifiedSearch) return null;
    const { AggregateQuerySearchBar } = unifiedSearch.ui;
    return <AggregateQuerySearchBar<QT> {...searchBarProps} />;
  };

  if (setMenuMountPoint && (badgesComponent || menuComponent)) {
    return (
      <MountPointPortal setMountPoint={setMenuMountPoint}>
        <span
          className="kbnTopNavMenu__wrapper"
          css={[styles.badgeWrapper, visible === false && styles.hidden]}
        >
          {badgesComponent}
          {menuComponent}
        </span>
      </MountPointPortal>
    );
  }

  return (
    <>
      <span css={[visible === false && styles.hidden]}>{menuComponent}</span>
      {renderSearchBar()}
    </>
  );
}
