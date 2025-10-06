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
import { SideNavV2CollapseButton } from './collapse_button';
import type { NavigationProps } from './types';

interface CollapsibleNavigationProps {
  toggle: (isVisible: boolean) => void;
  isCollapsed$: BehaviorSubject<boolean>;
  navProps: NavigationProps;
  side?: 'left' | 'right';
}

export const FixedLayoutProjectSideNavV2: FunctionComponent<CollapsibleNavigationProps> = ({
  toggle,
  isCollapsed$,
  navProps,
  side,
}) => {
  const isCollapsed = useObservable(isCollapsed$, isCollapsed$.getValue());

  return (
    <>
      <SideNavV2CollapseButton isCollapsed={isCollapsed} toggle={toggle} />
      <CollapsibleNavigationFlyout side={side}>
        {({ setWidth }) => (
          <Navigation {...navProps} isCollapsed={isCollapsed} setWidth={setWidth} />
        )}
      </CollapsibleNavigationFlyout>
    </>
  );
};

const CollapsibleNavigationFlyout: FunctionComponent<{
  side?: 'left' | 'right';
  children: (props: { setWidth: (width: number) => void }) => React.ReactNode;
}> = ({ children, side = 'left' }) => {
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
        side={side}
        type={'push'}
        paddingSize="none"
        pushMinBreakpoint="xs"
        hideCloseButton={true}
        onClose={() => {}}
        className="hide-for-sharing"
        css={css`
          border-inline-end: none; // Remove default euiFlyout border when used as a sidenav
        `}
      >
        <div css={{ height: '100%', display: 'flex' }}>{children(childrenProps)}</div>
      </EuiFlyout>
    </>
  );
};
