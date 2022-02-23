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

import { KibanaPageTemplateSolutionNavProps } from './solution_nav/solution_nav';

import { NoDataPageProps } from './no_data_page';
import { withSolutionNavbar } from './with_solution_navbar';

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

export const KibanaPageTemplateInner: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
  className,
  pageHeader,
  children,
  isEmptyState,
  solutionNav,
  ...rest
}) => {
  /**
   * An easy way to create the right content for empty pages
   */
  const emptyStateDefaultTemplate = 'centeredBody';
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

  const classes = classNames(
    'kbnPageTemplate',
    { [`kbnPageTemplate--${template}`]: template },
    className
  );

  return (
    <EuiPageTemplate template={template} className={classes} pageHeader={pageHeader} {...rest}>
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNavbar(KibanaPageTemplateInner);
