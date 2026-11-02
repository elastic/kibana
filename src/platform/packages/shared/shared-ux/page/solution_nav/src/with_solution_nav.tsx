/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import React, { useState } from 'react';
import classNames from 'classnames';
import type { EuiPageSidebarProps } from '@elastic/eui';
import { useIsWithinBreakpoints, useEuiTheme, useIsWithinMinBreakpoint } from '@elastic/eui';
import type { SolutionNavProps } from './solution_nav';
import { SolutionNav } from './solution_nav';
import { WithSolutionNavStyles } from './with_solution_nav.styles';

// https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
function getDisplayName(Component: ComponentType<any>) {
  return Component.displayName || Component.name || 'UnnamedComponent';
}

export interface TemplateProps {
  children?: ReactNode;
  pageSideBar?: ReactNode;
  pageSideBarProps?: EuiPageSidebarProps;
  style?: CSSProperties;
}

type Props<P> = P &
  TemplateProps & {
    solutionNav: SolutionNavProps;
  };

const SOLUTION_NAV_COLLAPSED_KEY = 'solutionNavIsCollapsed';

export const withSolutionNav = <P extends TemplateProps>(WrappedComponent: ComponentType<P>) => {
  const WithSolutionNav = (props: Props<P>) => {
    const isSmallerBreakpoint = useIsWithinBreakpoints(['xs', 's']);
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
      isSmallerBreakpoint ||
      isMediumBreakpoint ||
      (canBeCollapsed && isLargerBreakpoint && !isSideNavOpenOnDesktop);
    const withSolutionNavStyles = WithSolutionNavStyles(euiTheme);
    const sideBarClasses = classNames(
      'kbnSolutionNav__sidebar',
      { 'kbnSolutionNav__sidebar--shrink': isSidebarShrunk },
      props.pageSideBarProps?.className,
      withSolutionNavStyles
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
      /**
       * Disable EuiPageSidebar's default responsive behavior (min-width: 100% at xs/s)
       * so the sidenav can be collapsed at small breakpoints.
       */
      responsive: [],
      minWidth: isSidebarShrunk ? euiTheme.size.xxl : undefined,
      className: sideBarClasses,
      hasEmbellish: !isSidebarShrunk,
    };

    /**
     * At small breakpoints, EuiPageTemplate switches to 'flex-direction: column'
     * which stacks the sidenav on top. Force row layout so the sidenav stays on the left.
     */
    const templateStyle: CSSProperties | undefined = isSmallerBreakpoint
      ? { ...propagatedProps.style, flexDirection: 'row' }
      : propagatedProps.style;

    return (
      <WrappedComponent
        {...{
          ...(propagatedProps as P),
          pageSideBar,
          pageSideBarProps,
          style: templateStyle,
        }}
      >
        {children}
      </WrappedComponent>
    );
  };

  WithSolutionNav.displayName = `WithSolutionNavBar(${getDisplayName(WrappedComponent)})`;

  return WithSolutionNav;
};
