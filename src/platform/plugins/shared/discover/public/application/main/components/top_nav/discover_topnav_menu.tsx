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
  useEffect,
} from 'react';
import { BehaviorSubject } from 'rxjs';
import useUnmount from 'react-use/lib/useUnmount';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import useObservable from 'react-use/lib/useObservable';
import type { useDiscoverTopNav } from './use_discover_topnav';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getReadOnlyBadge } from '../../../discover_router';

/**
 * We handle the top nav menu this way because we need to render it higher in the tree than
 * individual tabs to avoid remounting when switching tabs, which leads to UI flickering,
 * but the menu items are dependent on individual tab state. This approach allows us to
 * update the menu items from lower in the tree without remounting the menu component itself.
 */

const createTopNavMenuContext = () => ({
  topNavMenu$: new BehaviorSubject<AppMenuConfig | undefined>(undefined),
  topNavBadges$: new BehaviorSubject<ChromeBreadcrumbsBadge[] | undefined>(undefined),
});

type DiscoverTopNavMenuContext = ReturnType<typeof createTopNavMenuContext>;

export const discoverTopNavMenuContext = createContext<DiscoverTopNavMenuContext>(
  createTopNavMenuContext()
);

export const DiscoverTopNavMenuProvider = ({
  customizationContext,
  children,
}: PropsWithChildren<{ customizationContext: DiscoverCustomizationContext }>) => {
  const { chrome, capabilities } = useDiscoverServices();
  const [topNavMenuContext] = useState<DiscoverTopNavMenuContext>(() => createTopNavMenuContext());

  const topNavBadges = useObservable(
    topNavMenuContext.topNavBadges$,
    topNavMenuContext.topNavBadges$.getValue()
  );

  useEffect(() => {
    if (customizationContext.displayMode === 'embedded') {
      return;
    }

    const readOnlyBadge = getReadOnlyBadge({ capabilities });
    const badges = readOnlyBadge ? [readOnlyBadge] : [];

    if (topNavBadges) {
      badges.push(...topNavBadges);
    }

    chrome.setBreadcrumbsBadges(badges);
  }, [capabilities, chrome, customizationContext.displayMode, topNavBadges]);

  useUnmount(() => {
    topNavMenuContext.topNavBadges$.next(undefined);
    topNavMenuContext.topNavMenu$.next(undefined);
  });

  return (
    <discoverTopNavMenuContext.Provider value={topNavMenuContext}>
      {children}
    </discoverTopNavMenuContext.Provider>
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
