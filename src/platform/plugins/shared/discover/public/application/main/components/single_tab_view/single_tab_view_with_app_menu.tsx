/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { SingleTabView, type SingleTabViewProps } from '.';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useTopNavMenuItems } from '../top_nav/use_top_nav_menu_items';

export const SingleTabViewWithAppMenu = (props: SingleTabViewProps) => {
  const { chrome, discoverFeatureFlags } = useDiscoverServices();
  const isNextChrome = discoverFeatureFlags.getIsNextChrome();
  const topNavMenuItems = useTopNavMenuItems();

  useEffect(() => {
    if (isNextChrome && topNavMenuItems) {
      chrome.next.header.set({ appMenu: topNavMenuItems });
      return () => {
        chrome.next.header.set(undefined);
      };
    }
  }, [isNextChrome, topNavMenuItems, chrome.next.header]);

  return (
    <>
      {!isNextChrome && topNavMenuItems && (
        <AppMenu config={topNavMenuItems} setAppMenu={chrome.setAppMenu} />
      )}
      <SingleTabView {...props} />
    </>
  );
};
