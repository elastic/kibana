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
import { EuiPageSideBarProps } from '@elastic/eui/src/components/page/page_side_bar';
import { KibanaPageTemplateProps, KibanaPageTemplateSolutionNav } from '../page_template';

export const withSolutionNavbar = (
  WrappedComponent: React.FunctionComponent<KibanaPageTemplateProps>
) => {
  const WithSolutionNavBar = (props: KibanaPageTemplateProps) => {
    const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
    const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
    const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
      !JSON.parse(String(localStorage.getItem('solutionNavIsCollapsed')))
    );
    const { solutionNav, children, isEmptyState, template } = props;
    if (!solutionNav) {
      return <WrappedComponent {...props} />;
    }
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
      className: classNames(sideBarClasses, props.pageSideBarProps?.className),
    } as EuiPageSideBarProps;
    return (
      <WrappedComponent
        {...props}
        pageSideBar={pageSideBar}
        pageSideBarProps={pageSideBarProps}
        template={templateToUse}
      >
        {children}
      </WrappedComponent>
    );
  };
  WithSolutionNavBar.displayName = `WithSolutionNavBar${WrappedComponent}`;
  return WithSolutionNavBar;
};
