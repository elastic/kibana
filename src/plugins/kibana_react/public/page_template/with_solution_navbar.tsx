/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import classNames from 'classnames';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { KibanaPageTemplateSolutionNav } from '../page_template/solution_nav';
import { KibanaPageTemplateProps } from '../page_template';

export const withSolutionNavbar = <P extends object>(
  WrappedComponent: React.FunctionComponent<P & KibanaPageTemplateProps>
) => {
  const WithSolutionNavBar = (props: KibanaPageTemplateProps) => {
    const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
    const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
    const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
      JSON.parse(String(localStorage.getItem('solutionNavIsCollapsed'))) ? false : true
    );
    const { solutionNav, children } = props;
    const toggleOpenOnDesktop = () => {
      setisSideNavOpenOnDesktop(!isSideNavOpenOnDesktop);
      // Have to store it as the opposite of the default we want
      localStorage.setItem('solutionNavIsCollapsed', JSON.stringify(isSideNavOpenOnDesktop));
    };
    const sideBarClasses = classNames('kbnPageTemplate__pageSideBar', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'kbnPageTemplate__pageSideBar--shrink':
        isMediumBreakpoint || (isLargerBreakpoint && !isSideNavOpenOnDesktop),
    });

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
      className: classNames(sideBarClasses, props.pageSideBarProps?.className),
    };
    return (
      <WrappedComponent {...props} pageSideBar={pageSideBar} pageSideBarProps={pageSideBarProps}>
        {children}
      </WrappedComponent>
    );
  };
  WithSolutionNavBar.displayName = `WithSolutionNavBar${WrappedComponent}`;
  return WithSolutionNavBar;
};
