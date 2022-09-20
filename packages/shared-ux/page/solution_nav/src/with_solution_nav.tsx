/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, ReactNode, useState } from 'react';
import classNames from 'classnames';
import {
  useIsWithinBreakpoints,
  useEuiTheme,
  useIsWithinMinBreakpoint,
  EuiPageSidebarProps,
} from '@elastic/eui';
import { SolutionNav, SolutionNavProps } from './solution_nav';

import './with_solution_nav.scss';

// https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
function getDisplayName(Component: ComponentType<any>) {
  return Component.displayName || Component.name || 'UnnamedComponent';
}

// TODO: Would be nice to grab these from KibanaPageTemplate or vice-versa
interface TemplateProps {
  pageSideBar?: ReactNode;
  pageSideBarProps?: Partial<EuiPageSidebarProps>;
  children?: ReactNode;
}

type Props<P> = P &
  TemplateProps & {
    solutionNav: SolutionNavProps;
  };

const SOLUTION_NAV_COLLAPSED_KEY = 'solutionNavIsCollapsed';

export const withSolutionNav = <P extends TemplateProps>(WrappedComponent: ComponentType<P>) => {
  const WithSolutionNav = (props: Props<P>) => {
    const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
    const isLargerBreakpoint = useIsWithinMinBreakpoint('l');
    const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
      !JSON.parse(String(localStorage.getItem(SOLUTION_NAV_COLLAPSED_KEY)))
    );

    const { solutionNav, children, ...propagatedProps } = props;
    const { euiTheme } = useEuiTheme();

    const toggleOpenOnDesktop = () => {
      setisSideNavOpenOnDesktop(!isSideNavOpenOnDesktop);
      // Have to store it as the opposite of the default we want
      localStorage.setItem(SOLUTION_NAV_COLLAPSED_KEY, JSON.stringify(isSideNavOpenOnDesktop));
    };

    // Default navigation to allow collapsing
    const { canBeCollapsed = true } = solutionNav;
    const isSidebarShrunk =
      isMediumBreakpoint || (canBeCollapsed && isLargerBreakpoint && !isSideNavOpenOnDesktop);
    const sideBarClasses = classNames(
      'kbnSolutionNav__sidebar',
      'kbnStickyMenu',
      {
        'kbnSolutionNav__sidebar--shrink': isSidebarShrunk,
      },
      props.pageSideBarProps?.className
    );

    const pageSideBar = (
      <SolutionNav
        isOpenOnDesktop={isSideNavOpenOnDesktop}
        onCollapse={toggleOpenOnDesktop}
        {...solutionNav}
      />
    );

    const pageSideBarProps: TemplateProps['pageSideBarProps'] = {
      paddingSize: 'none' as 'none',
      ...props.pageSideBarProps,
      minWidth: isSidebarShrunk ? euiTheme.size.xxl : undefined,
      className: sideBarClasses,
    };

    return (
      <WrappedComponent
        {...{
          ...(propagatedProps as P),
          pageSideBar,
          pageSideBarProps,
        }}
      >
        {children}
      </WrappedComponent>
    );
  };

  WithSolutionNav.displayName = `WithSolutionNavBar(${getDisplayName(WrappedComponent)})`;

  return WithSolutionNav;
};
