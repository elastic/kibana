/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './page_template.scss';

import React, { FunctionComponent } from 'react';
import classNames from 'classnames';

import { EuiEmptyPrompt, EuiPageTemplate, EuiPageTemplateProps } from '@elastic/eui';

import {
  KibanaPageTemplateSolutionNav,
  KibanaPageTemplateSolutionNavProps,
} from './solution_nav/solution_nav';

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
};

export const KibanaPageTemplate: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
  pageHeader,
  children,
  isEmptyState,
  restrictWidth = true,
  bottomBar,
  bottomBarProps,
  pageSideBar,
  solutionNav,
  ...rest
}) => {
  // Needed for differentiating between union types
  let localBottomBarProps = {};
  if (template === 'default') {
    localBottomBarProps = {
      bottomBar,
      bottomBarProps,
    };
  }

  /**
   * Create the solution nav component
   */
  if (solutionNav) {
    pageSideBar = <KibanaPageTemplateSolutionNav {...solutionNav} />;
  }

  /**
   * An easy way to create the right content for empty pages
   */
  if (isEmptyState && pageHeader && !children) {
    template = template ?? 'centeredBody';
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
    template = template ?? 'centeredBody';
  }

  return (
    <EuiPageTemplate
      template={template}
      restrictWidth={restrictWidth}
      paddingSize={template === 'centeredBody' ? 'none' : 'l'}
      pageHeader={pageHeader}
      pageSideBar={pageSideBar}
      pageSideBarProps={{
        ...rest.pageSideBarProps,
        className: classNames('kbnPageTemplate__pageSideBar', rest.pageSideBarProps?.className),
      }}
      {...localBottomBarProps}
      {...rest}
    >
      {children}
    </EuiPageTemplate>
  );
};
