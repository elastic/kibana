/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';

import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { withSolutionNav } from './with_solution_nav';
import { KibanaPageTemplateProps } from './page_template';
import { getClasses } from './util';

type Props = KibanaPageTemplateProps;

/**
 * A thin wrapper around EuiPageTemplate with a few Kibana specific additions
 */
export const KibanaPageTemplateInner: FunctionComponent<Props> = ({
  template,
  className,
  pageHeader,
  children,
  isEmptyState,
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

  const classes = getClasses(template, className);

  return (
    <EuiPageTemplate template={template} className={classes} pageHeader={pageHeader} {...rest}>
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
