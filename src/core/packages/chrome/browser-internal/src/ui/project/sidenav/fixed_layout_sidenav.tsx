/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { css, Global } from '@emotion/react';

import { Navigation } from './navigation';
import { SideNavCollapseButton } from './collapse_button';
import type { NavigationProps } from './types';

interface CollapsibleNavigationProps {
  toggle: (isVisible: boolean) => void;
  isCollapsed$: BehaviorSubject<boolean>;
  navProps: NavigationProps;
}

export const FixedLayoutProjectSideNav: FunctionComponent<CollapsibleNavigationProps> = ({
  toggle,
  isCollapsed$,
  navProps,
}) => {
  const isCollapsed = useObservable(isCollapsed$, isCollapsed$.getValue());

  return (
    <>
      <SideNavCollapseButton isCollapsed={isCollapsed} toggle={toggle} />
      <CollapsibleNavigationFlyout>
        {({ setWidth }) => (
          <Navigation {...navProps} isCollapsed={isCollapsed} setWidth={setWidth} />
        )}
      </CollapsibleNavigationFlyout>
    </>
  );
};

const CollapsibleNavigationFlyout: FunctionComponent<{
  children: (props: { setWidth: (width: number) => void }) => React.ReactNode;
}> = ({ children }) => {
  const [width, setWidth] = React.useState<number>(0);

  const childrenProps = React.useMemo(() => ({ setWidth }), [setWidth]);

  return (
    <>
      <Global
        styles={css`
          :root {
            // have to provide this fallback to avoid bugs when EuiCollapsibleNavBeta is missing
            --euiCollapsibleNavOffset: ${width}px;
          }
        `}
      />
      <EuiFlyout
        size={width}
        side={'left'}
        type={'push'}
        paddingSize="none"
        pushMinBreakpoint="xs"
        hideCloseButton={true}
        onClose={() => {}}
        className="hide-for-sharing"
        css={css`
          border-inline-end: none; // Remove default euiFlyout border when used as a sidenav
        `}
        session="never"
      >
        <div css={{ height: '100%', display: 'flex' }}>{children(childrenProps)}</div>
      </EuiFlyout>
    </>
  );
};
