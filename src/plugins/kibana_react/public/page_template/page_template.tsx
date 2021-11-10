/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import './page_template.scss';

import React, { FunctionComponent, useState } from 'react';
import classNames from 'classnames';

import {
  EuiEmptyPrompt,
  EuiPageTemplate,
  EuiPageTemplateProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import {
  KibanaPageTemplateSolutionNav,
  KibanaPageTemplateSolutionNavProps,
} from './solution_nav/solution_nav';

import { NoDataPage, NoDataPageProps, NO_DATA_PAGE_TEMPLATE_PROPS } from './no_data_page';

/**
 * A thin wrapper around EuiPageTemplate with a few Kibana specific additions
 */
export type KibanaPageTemplateProps = EuiPageTemplateProps & {
  /**
   * Changes the template type depending on other props provided.
   * With `pageHeader` only: Uses `centeredBody` and fills an EuiEmptyPrompt with `pageHeader` info.
   * With `children` only: Uses `centeredBody`
   * With `pageHeader` and `children`: Uses `centeredContent`
   */
  isEmptyState?: boolean;
  /**
   * Quick creation of EuiSideNav. Hooks up mobile instance too
   */
  solutionNav?: KibanaPageTemplateSolutionNavProps;
  /**
   * Accepts a configuration object, that when provided, ignores pageHeader and children and instead
   * displays Agent, Beats, and custom cards to direct users to the right ingest location
   */
  noDataConfig?: NoDataPageProps;
};

export const KibanaPageTemplate: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
  className,
  pageHeader,
  children,
  isEmptyState,
  restrictWidth = true,
  pageSideBar,
  pageSideBarProps,
  solutionNav,
  noDataConfig,
  ...rest
}) => {
  /**
   * Only default to open in large+ breakpoints
   */
  const isMediumBreakpoint = useIsWithinBreakpoints(['m']);
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);

  /**
   * Create the solution nav component
   */
  const [isSideNavOpenOnDesktop, setisSideNavOpenOnDesktop] = useState(
    JSON.parse(String(localStorage.getItem('solutionNavIsCollapsed'))) ? false : true
  );
  const toggleOpenOnDesktop = () => {
    setisSideNavOpenOnDesktop(!isSideNavOpenOnDesktop);
    // Have to store it as the opposite of the default we want
    localStorage.setItem('solutionNavIsCollapsed', JSON.stringify(isSideNavOpenOnDesktop));
  };
  let sideBarClasses = 'kbnPageTemplate__pageSideBar';
  if (solutionNav) {
    // Only apply shrinking classes if collapsibility is available through `solutionNav`
    sideBarClasses = classNames(sideBarClasses, {
      'kbnPageTemplate__pageSideBar--shrink':
        isMediumBreakpoint || (isLargerBreakpoint && !isSideNavOpenOnDesktop),
    });

    pageSideBar = (
      <KibanaPageTemplateSolutionNav
        isOpenOnDesktop={isSideNavOpenOnDesktop}
        onCollapse={toggleOpenOnDesktop}
        {...solutionNav}
      />
    );
  }

  /**
   * An easy way to create the right content for empty pages
   */
  const emptyStateDefaultTemplate = pageSideBar ? 'centeredContent' : 'centeredBody';
  if (isEmptyState && pageHeader && !children) {
    template = template ?? emptyStateDefaultTemplate;
    const { iconType, pageTitle, description, rightSideItems } = pageHeader;
    pageHeader = undefined;
    children = (
      <EuiEmptyPrompt
        iconType={iconType}
        iconColor={''} // This is likely a solution or app logo, so keep it multi-color
        title={pageTitle ? <h1>{pageTitle}</h1> : undefined}
        body={description ? <p>{description}</p> : undefined}
        actions={rightSideItems}
      />
    );
  } else if (isEmptyState && pageHeader && children) {
    template = template ?? 'centeredContent';
  } else if (isEmptyState && !pageHeader) {
    template = template ?? emptyStateDefaultTemplate;
  }

  // Set the template before the classes
  template = noDataConfig ? NO_DATA_PAGE_TEMPLATE_PROPS.template : template;

  const classes = classNames(
    'kbnPageTemplate',
    { [`kbnPageTemplate--${template}`]: template },
    className
  );

  /**
   * If passing the custom template of `noDataConfig`
   */
  if (noDataConfig) {
    return (
      <EuiPageTemplate
        data-test-subj={rest['data-test-subj']}
        template={template}
        className={classes}
        pageSideBar={pageSideBar}
        pageSideBarProps={{
          paddingSize: solutionNav ? 'none' : 'l',
          ...pageSideBarProps,
          className: classNames(sideBarClasses, pageSideBarProps?.className),
        }}
        {...NO_DATA_PAGE_TEMPLATE_PROPS}
      >
        <NoDataPage {...noDataConfig} />
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate
      template={template}
      className={classes}
      restrictWidth={restrictWidth}
      pageHeader={pageHeader}
      pageSideBar={pageSideBar}
      pageSideBarProps={{
        paddingSize: solutionNav ? 'none' : 'l',
        ...pageSideBarProps,
        className: classNames(sideBarClasses, pageSideBarProps?.className),
      }}
      {...rest}
    >
      {children}
    </EuiPageTemplate>
  );
};
