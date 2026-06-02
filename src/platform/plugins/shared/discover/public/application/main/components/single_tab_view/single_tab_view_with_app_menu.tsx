/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { SingleTabView, type SingleTabViewProps } from '.';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useTopNavMenuItems } from '../top_nav/use_top_nav_menu_items';

export interface SingleTabViewWithAppMenuProps extends SingleTabViewProps {
  headerTitle: string;
}

export const SingleTabViewWithAppMenu = ({
  headerTitle,
  ...props
}: SingleTabViewWithAppMenuProps) => {
  const { chrome } = useDiscoverServices();
  const topNavMenuItems = useTopNavMenuItems();
  const isChromeNextProjectHeader = useMemo(
    () => chrome.next.isEnabled && chrome.getChromeStyle() === 'project',
    [chrome]
  );

  return (
    <>
      {isChromeNextProjectHeader ? (
        <AppHeader title={headerTitle} menu={topNavMenuItems} sticky={false} padding="m" />
      ) : (
        topNavMenuItems && <AppMenu config={topNavMenuItems} setAppMenu={chrome.setAppMenu} />
      )}
      <SingleTabView {...props} />
    </>
  );
};
