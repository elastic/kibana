/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type PropsWithChildren,
  createContext,
  useContext,
  useState,
  useLayoutEffect,
} from 'react';
import {
  TopNavMenu,
  type TopNavMenuBadgeProps,
  type TopNavMenuData,
} from '@kbn/navigation-plugin/public';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import useUnmount from 'react-use/lib/useUnmount';
import { css } from '@emotion/css';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { useDiscoverTopNav } from './use_discover_topnav';

/**
 * We handle the top nav menu this way because we need to render it higher in the tree than
 * individual tabs to avoid remounting when switching tabs, which leads to UI flickering,
 * but the menu items are dependent on individual tab state. This approach allows us to
 * update the menu items from lower in the tree without remounting the menu component itself.
 */

const createTopNavMenuContext = () => ({
  topNavMenu$: new BehaviorSubject<TopNavMenuData[] | undefined>(undefined),
  topNavBadges$: new BehaviorSubject<TopNavMenuBadgeProps[] | undefined>(undefined),
});

type DiscoverTopNavMenuContext = ReturnType<typeof createTopNavMenuContext>;

const discoverTopNavMenuContext = createContext<DiscoverTopNavMenuContext>(
  createTopNavMenuContext()
);

// If there are no menu items to render yet, we render a placeholder
// item to ensure the menu still displays and to prevent flickering
const PLACEHOLDER_MENU_ITEMS: TopNavMenuData[] = [
  {
    label: '',
    run: () => {},
    className: css({ display: 'none' }),
  },
];

export const DiscoverTopNavMenuProvider = ({ children }: PropsWithChildren) => {
  const { setHeaderActionMenu } = useDiscoverServices();
  const [topNavMenuContext] = useState<DiscoverTopNavMenuContext>(() => createTopNavMenuContext());

  const topNavMenu = useObservable(
    topNavMenuContext.topNavMenu$,
    topNavMenuContext.topNavMenu$.getValue()
  );

  const topNavBadges = useObservable(
    topNavMenuContext.topNavBadges$,
    topNavMenuContext.topNavBadges$.getValue()
  );

  useUnmount(() => {
    topNavMenuContext.topNavBadges$.next(undefined);
    topNavMenuContext.topNavMenu$.next(undefined);
  });

  return (
    <>
      <TopNavMenu
        appName="discover"
        badges={topNavBadges}
        config={topNavMenu && topNavMenu.length > 0 ? topNavMenu : PLACEHOLDER_MENU_ITEMS}
        gutterSize="xxs"
        setMenuMountPoint={setHeaderActionMenu}
      />
      <discoverTopNavMenuContext.Provider value={topNavMenuContext}>
        {children}
      </discoverTopNavMenuContext.Provider>
    </>
  );
};

export const DiscoverTopNavMenu = ({
  topNavBadges,
  topNavMenu,
}: ReturnType<typeof useDiscoverTopNav>) => {
  const { topNavBadges$, topNavMenu$ } = useContext(discoverTopNavMenuContext);

  useLayoutEffect(() => {
    topNavBadges$.next(topNavBadges);
  }, [topNavBadges, topNavBadges$]);

  useLayoutEffect(() => {
    topNavMenu$.next(topNavMenu);
  }, [topNavMenu, topNavMenu$]);

  return null;
};
