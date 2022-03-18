/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, useState } from 'react';
import classNames from 'classnames';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { EuiPageSideBarProps } from '@elastic/eui/src/components/page/page_side_bar';
import {
  KibanaPageTemplateSolutionNav,
  KibanaPageTemplateSolutionNavProps,
} from '../page_template/solution_nav';
import { KibanaPageTemplateProps } from '../page_template';

// https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
function getDisplayName(Component: ComponentType<any>) {
  return Component.displayName || Component.name || 'UnnamedComponent';
}

type SolutionNavProps = KibanaPageTemplateProps & {
  solutionNav: KibanaPageTemplateSolutionNavProps;
};

const SOLUTION_NAV_COLLAPSED_KEY = 'solutionNavIsCollapsed';

export const withSolutionNav = (WrappedComponent: ComponentType<KibanaPageTemplateProps>) => {
  const WithSolutionNav = (props: SolutionNavProps) => {
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
    const sideBarClasses = classNames(
      'kbnPageTemplate__pageSideBar',
      {
        'kbnPageTemplate__pageSideBar--shrink':
          isMediumBreakpoint || (isLargerBreakpoint && !isSideNavOpenOnDesktop),
      },
      props.pageSideBarProps?.className
    );

    const templateToUse = isEmptyState && !template ? 'centeredContent' : template;

    const pageSideBar = (
      <KibanaPageTemplateSolutionNav
        isOpenOnDesktop={isSideNavOpenOnDesktop}
        onCollapse={toggleOpenOnDesktop}
        {...solutionNav}
      />
    );
    const pageSideBarProps = {
      paddingSize: 'none',
      ...props.pageSideBarProps,
      className: sideBarClasses,
    } as EuiPageSideBarProps; // needed because for some reason 'none' is not recognized as a valid value for paddingSize
    return (
      <WrappedComponent
        {...propagatedProps}
        pageSideBar={pageSideBar}
        pageSideBarProps={pageSideBarProps}
        template={templateToUse}
      >
        {children}
      </WrappedComponent>
    );
  };
  WithSolutionNav.displayName = `WithSolutionNavBar(${getDisplayName(WrappedComponent)})`;
  return WithSolutionNav;
};
