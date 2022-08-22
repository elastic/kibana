/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import classNames from 'classnames';
import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';

import { withSolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { KibanaPageTemplateProps as Props } from '@kbn/shared-ux-page-kibana-template-types';

const getClasses = (template?: string, className?: string) => {
  return classNames(
    'kbnPageTemplate',
    template ? { [`kbnPageTemplate--${template}`]: template } : '',
    className || ''
  );
};

/**
 * A thin wrapper around EuiPageTemplate with a few Kibana specific additions
 */
export const KibanaPageTemplateInner: FC<Props> = ({
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
  let header = pageHeader;

  if (isEmptyState) {
    if (pageHeader && !children) {
      template = template ?? emptyStateDefaultTemplate;
      const { iconType, pageTitle, description, rightSideItems } = pageHeader;
      const title = pageTitle ? <h1>{pageTitle}</h1> : undefined;
      const body = description ? <p>{description}</p> : undefined;
      header = undefined;
      children = (
        <EuiEmptyPrompt
          iconType={iconType}
          iconColor="" // This is likely a solution or app logo, so keep it multi-color
          title={title}
          body={body}
          actions={rightSideItems}
        />
      );
    } else if (pageHeader && children) {
      template = template ?? 'centeredContent';
    } else if (!pageHeader) {
      template = template ?? emptyStateDefaultTemplate;
    }
  }

  const classes = getClasses(template, className);
  return (
    <EuiPageTemplate template={template} className={classes} pageHeader={header} {...rest}>
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
