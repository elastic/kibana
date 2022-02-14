/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './page_template.scss';

import React, { FunctionComponent } from 'react';

import {
  EuiEmptyPrompt,
  EuiPageTemplate,
  EuiPageTemplateProps,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import { useLocalStorage } from 'react-use/lib';
import { getPageSideBarProps, getClasses } from './helpers/rendering_helper';
import {
  KibanaPageTemplateSolutionNav,
  KibanaPageTemplateSolutionNavProps,
} from './solution_nav/solution_nav';

import { EmptyStatePage } from '../empty_state_page';
import { NoDataPageProps } from './no_data_page';

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
  const isSideNavOpenOnDesktop = !useLocalStorage('solutionNavIsCollapsed');
  const shouldApplyShrinkingClass =
    isMediumBreakpoint || (isLargerBreakpoint && !isSideNavOpenOnDesktop);

  const getPageSideBar = () => {
    if (!solutionNav) {
      return pageSideBar;
    }
    return <KibanaPageTemplateSolutionNav {...solutionNav} />;
  };

  const getEmptyStateTemplate = () => {
    const emptyStateDefaultTemplate = pageSideBar ? 'centeredContent' : 'centeredBody';
    let emptyStateTemplate = template ?? emptyStateDefaultTemplate;
    if (pageHeader && !children) {
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
    } else if (pageHeader && children) {
      emptyStateTemplate = template ?? 'centeredContent';
    } else if (!pageHeader) {
      emptyStateTemplate = template ?? emptyStateDefaultTemplate;
    }
    return emptyStateTemplate;
  };

  if (isEmptyState) {
    template = getEmptyStateTemplate();
  }

  if (noDataConfig) {
    template = 'centeredBody';
  }

  /**
   * If passing the custom template of `noDataConfig`
   */
  if (noDataConfig) {
    return (
      <EmptyStatePage
        data-test-subj={rest['data-test-subj']}
        template={template}
        className={className}
        pageSideBar={pageSideBar}
        pageSideBarProps={pageSideBarProps}
        noDataConfig={noDataConfig}
      />
    );
  }

  return (
    <EuiPageTemplate
      template={template}
      className={getClasses(template, className)}
      restrictWidth={restrictWidth}
      pageHeader={pageHeader}
      pageSideBar={getPageSideBar()}
      pageSideBarProps={getPageSideBarProps(
        Boolean(solutionNav),
        shouldApplyShrinkingClass,
        pageSideBarProps
      )}
      {...rest}
    >
      {children}
    </EuiPageTemplate>
  );
};
