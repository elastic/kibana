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
import { type TopNavMenuBadgeProps, type TopNavMenuData } from '@kbn/navigation-plugin/public';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import useUnmount from 'react-use/lib/useUnmount';
import { TopNavMenuBeta } from '@kbn/app-menu';
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
  rightSideContent$: new BehaviorSubject<React.ReactNode | undefined>(undefined),
});

type DiscoverTopNavMenuContext = ReturnType<typeof createTopNavMenuContext>;

const discoverTopNavMenuContext = createContext<DiscoverTopNavMenuContext>(
  createTopNavMenuContext()
);

export const DiscoverTopNavMenuProvider = ({ children }: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  const [topNavMenuContext] = useState<DiscoverTopNavMenuContext>(() => createTopNavMenuContext());

  const rightSideContent = useObservable(
    topNavMenuContext.rightSideContent$,
    topNavMenuContext.rightSideContent$.getValue()
  );

  useUnmount(() => {
    topNavMenuContext.topNavBadges$.next(undefined);
    topNavMenuContext.topNavMenu$.next(undefined);
    topNavMenuContext.rightSideContent$.next(undefined);
  });

  return (
    <>
      <discoverTopNavMenuContext.Provider value={topNavMenuContext}>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          wrap={false}
          responsive={false}
          css={css`
            width: 100%;
            background-color: ${euiTheme.colors.lightestShade};
          `}
        >
          {rightSideContent && (
            <EuiFlexItem
              grow={true}
              css={css`
                min-width: 0;
                overflow: hidden;
              `}
            >
              {rightSideContent}
            </EuiFlexItem>
          )}

          <EuiFlexItem
            grow={false}
            css={css`
              flex-shrink: 0;
            `}
          >
            <TopNavMenuBeta
              config={{
                items: [
                  {
                    label: 'Test',
                    run: () => {},
                    order: 1,
                    id: 'placeholder',
                    iconType: 'gear',
                  },
                ],
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
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

/**
 * Hook to register content that appears next to TopNavMenuBeta.
 * Use this from child components (like TabsView) to add content to the top nav area.
 */
export const useRegisterTopNavRightSideContent = (content: React.ReactNode) => {
  const { rightSideContent$ } = useContext(discoverTopNavMenuContext);

  useLayoutEffect(() => {
    rightSideContent$.next(content);
    return () => {
      rightSideContent$.next(undefined);
    };
  }, [content, rightSideContent$]);
};
