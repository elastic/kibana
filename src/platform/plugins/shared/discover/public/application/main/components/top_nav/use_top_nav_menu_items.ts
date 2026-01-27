/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { discoverTopNavMenuContext } from './discover_topnav_menu';

/**
 * Hook to access the top nav menu items from context.
 * This provides a shared way to get the menu items in both
 * TabsView and SingleTabView scenarios.
 */
export const useTopNavMenuItems = () => {
  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);
  const topNavMenuItems = useObservable(topNavMenu$, topNavMenu$.getValue());

  return topNavMenuItems;
};
