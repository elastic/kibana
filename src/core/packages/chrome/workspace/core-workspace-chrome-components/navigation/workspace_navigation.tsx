/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import type { NavigationProps } from '@kbn/core-chrome-navigation';
import { Navigation } from '@kbn/core-chrome-navigation';
import {
  setActiveItemId,
  useCurrentAppId,
  useIsNavigationCollapsed,
  useWorkspaceDispatch,
} from '@kbn/core-workspace-chrome-state';
import { setNavigationWidth, useActiveItemId } from '@kbn/core-workspace-chrome-state';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { css, Global } from '@emotion/react';
import type { RedirectAppLinksComponentProps } from '@kbn/shared-ux-link-redirect-app-types';
import { EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import { WorkspaceNavControl } from './workspace_nav_control';

type RedirectNavigationAppLinksProps = Pick<
  RedirectAppLinksComponentProps,
  'navigateToUrl' | 'children'
>;

export type WorkspaceNavigationProps = Pick<NavigationProps, 'items' | 'logo'> &
  Pick<RedirectNavigationAppLinksProps, 'navigateToUrl'>;

const RedirectNavigationAppLinks = ({ children, ...props }: RedirectNavigationAppLinksProps) => {
  const currentAppId = useCurrentAppId();
  const isCollapsed = useIsNavigationCollapsed();
  const { euiTheme } = useEuiTheme();

  const styles = css`
    display: flex;
    height: 100%;
    flex-direction: row;
    justify-content: start;

    .side_panel {
      border-left: ${isCollapsed ? 'none' : `1px solid ${euiTheme.colors.borderBaseSubdued}`};
    }

    --kbn-navigation--secondary-menu-width: 256px;
  `;

  return (
    <RedirectAppLinks
      // reset default redirect app links styles
      css={styles}
      {...{ currentAppId, ...props }}
    >
      {children}
    </RedirectAppLinks>
  );
};

export const WorkspaceNavigation = ({ items, logo, navigateToUrl }: WorkspaceNavigationProps) => {
  const isCollapsed = useIsNavigationCollapsed();
  const activeItemId = useActiveItemId();
  const dispatch = useWorkspaceDispatch();
  const setWidth = (width: number) => {
    dispatch(setNavigationWidth(width));
  };
  const { euiTheme } = useEuiTheme();
  const fallbackActiveItemId = activeItemId ?? items.primaryItems[0]?.id;
  const navigationFallback = (
    <EuiSkeletonRectangle
      css={css`
        margin: ${euiTheme.size.base};
      `}
      width={16}
      height={16}
      borderRadius="s"
      contentAriaLabel="Loading workspace navigation"
    />
  );

  return (
    <RedirectNavigationAppLinks {...{ navigateToUrl }}>
      <Global
        styles={css`
          :root {
            // have to provide this fallback to avoid bugs when EuiCollapsibleNavBeta is missing
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <Suspense fallback={navigationFallback}>
        <Navigation
          onItemClick={(item) => dispatch(setActiveItemId(item.id))}
          {...{
            isCollapsed,
            setWidth,
            activeItemId: fallbackActiveItemId,
            items,
            logo,
          }}
        >
          <WorkspaceNavControl />
        </Navigation>
      </Suspense>
    </RedirectNavigationAppLinks>
  );
};
