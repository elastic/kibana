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
import { BehaviorSubject } from 'rxjs';
import useUnmount from 'react-use/lib/useUnmount';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { useDiscoverTopNav } from './use_discover_topnav';

/**
 * We handle the top nav menu this way because we need to render it higher in the tree than
 * individual tabs to avoid remounting when switching tabs, which leads to UI flickering,
 * but the menu items are dependent on individual tab state. This approach allows us to
 * update the menu items from lower in the tree without remounting the menu component itself.
 */

const createTopNavMenuContext = () => ({
  topNavMenu$: new BehaviorSubject<AppMenuConfig | undefined>(undefined),
});

type DiscoverTopNavMenuContext = ReturnType<typeof createTopNavMenuContext>;

export const discoverTopNavMenuContext = createContext<DiscoverTopNavMenuContext>(
  createTopNavMenuContext()
);

export const DiscoverTopNavMenuProvider = ({ children }: PropsWithChildren) => {
  const [topNavMenuContext] = useState<DiscoverTopNavMenuContext>(() => createTopNavMenuContext());

  useUnmount(() => {
    topNavMenuContext.topNavMenu$.next(undefined);
  });

  return (
    <discoverTopNavMenuContext.Provider value={topNavMenuContext}>
      {children}
    </discoverTopNavMenuContext.Provider>
  );
};

export const DiscoverTopNavMenu = ({
  topNavMenu,
  renderAppMenuOutsideTabs,
  setAppMenu,
}: Pick<ReturnType<typeof useDiscoverTopNav>, 'topNavMenu'> & {
  renderAppMenuOutsideTabs: boolean;
  setAppMenu: (config?: AppMenuConfig) => void;
}) => {
  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);

  useLayoutEffect(() => {
    topNavMenu$.next(topNavMenu);
  }, [topNavMenu, topNavMenu$]);

  if (renderAppMenuOutsideTabs) {
    return <AppMenu config={topNavMenu$.getValue()} setAppMenu={setAppMenu} />;
  }
  return null;
};
