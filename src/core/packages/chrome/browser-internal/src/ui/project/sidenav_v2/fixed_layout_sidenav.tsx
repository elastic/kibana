/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { css, Global } from '@emotion/react';
import {
  LOGO,
  PRIMARY_MENU_FOOTER_ITEMS,
  PRIMARY_MENU_ITEMS,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '@kbn/core-chrome-navigation/src/mocks/observability';
import { Navigation as NavigationComponent } from '@kbn/core-chrome-navigation';
import { SideNavV2CollapseButton } from './collapse_button';

const demoItems = {
  primaryItems: PRIMARY_MENU_ITEMS,
  footerItems: PRIMARY_MENU_FOOTER_ITEMS,
};

interface CollapsibleNavigationProps {
  toggle: (isVisible: boolean) => void;
  isCollapsed$: BehaviorSubject<boolean>;
}

export const FixedLayoutProjectSideNavV2: FunctionComponent<CollapsibleNavigationProps> = ({
  toggle,
  isCollapsed$,
}) => {
  const isCollapsed = useObservable(isCollapsed$, isCollapsed$.getValue());

  return (
    <>
      <SideNavV2CollapseButton isCollapsed={isCollapsed} toggle={toggle} />
      <CollapsibleNavigationFlyout>
        {({ setWidth }) => (
          <NavigationComponent
            isCollapsed={isCollapsed}
            items={demoItems}
            logoLabel={LOGO.label}
            logoType={LOGO.logoType}
            setWidth={setWidth}
          />
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
      >
        <div css={{ height: '100%', display: 'flex' }}>{children(childrenProps)}</div>
      </EuiFlyout>
    </>
  );
};
