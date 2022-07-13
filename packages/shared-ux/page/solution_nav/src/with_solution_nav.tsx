/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, useState } from 'react';
import classNames from 'classnames';
import { useIsWithinBreakpoints, EuiPageTemplateProps } from '@elastic/eui';
import { SolutionNav, SolutionNavProps } from './solution_nav';

import './with_solution_nav.scss';

// https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
function getDisplayName(Component: ComponentType<any>) {
  return Component.displayName || Component.name || 'UnnamedComponent';
}

type TemplateProps = Pick<
  EuiPageTemplateProps,
  'pageSideBar' | 'pageSideBarProps' | 'template' | 'children'
>;

type ComponentProps = TemplateProps & {
  isEmptyState?: boolean;
};

type Props<P> = P &
  ComponentProps & {
    solutionNav: SolutionNavProps;
  };

const SOLUTION_NAV_COLLAPSED_KEY = 'solutionNavIsCollapsed';

export const withSolutionNav = <P extends ComponentProps>(WrappedComponent: ComponentType<P>) => {
  const WithSolutionNav = (props: Props<P>) => {
    const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
    const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
    const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
      !JSON.parse(String(localStorage.getItem(SOLUTION_NAV_COLLAPSED_KEY)))
    );
    const { solutionNav, ...propagatedProps } = props;
    const { children, isEmptyState, template } = propagatedProps;

    const toggleOpenOnDesktop = () => {
      setisSideNavOpenOnDesktop(!isSideNavOpenOnDesktop);
      // Have to store it as the opposite of the default we want
      localStorage.setItem(SOLUTION_NAV_COLLAPSED_KEY, JSON.stringify(isSideNavOpenOnDesktop));
    };

    // Default navigation to allow collapsing
    const { canBeCollapsed = true } = solutionNav;
    const sideBarClasses = classNames(
      'kbnSolutionNav__sidebar',
      {
        'kbnSolutionNav__sidebar--shrink':
          isMediumBreakpoint || (canBeCollapsed && isLargerBreakpoint && !isSideNavOpenOnDesktop),
      },
      props.pageSideBarProps?.className
    );

    const templateToUse = isEmptyState && !template ? 'centeredContent' : template;

    const pageSideBar = (
      <SolutionNav
        isOpenOnDesktop={isSideNavOpenOnDesktop}
        onCollapse={toggleOpenOnDesktop}
        {...solutionNav}
      />
    );

    const pageSideBarProps = {
      paddingSize: 'none' as 'none',
      ...props.pageSideBarProps,
      className: sideBarClasses,
    };

    return (
      <WrappedComponent
        {...{
          ...(propagatedProps as P),
          pageSideBar,
          pageSideBarProps,
          template: templateToUse,
        }}
      >
        {children}
      </WrappedComponent>
    );
  };

  WithSolutionNav.displayName = `WithSolutionNavBar(${getDisplayName(WrappedComponent)})`;

  return WithSolutionNav;
};
