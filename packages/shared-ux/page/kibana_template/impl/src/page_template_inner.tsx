/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import classNames from 'classnames';
import { EuiPageTemplate } from '@elastic/eui';

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
  let header;

  if (isEmptyState && pageHeader && !children) {
    const { iconType, pageTitle, description, rightSideItems } = pageHeader;
    const title = pageTitle ? <h1>{pageTitle}</h1> : undefined;
    const body = description ? <p>{description}</p> : undefined;
    children = (
      <EuiPageTemplate.EmptyPrompt
        iconType={iconType}
        iconColor="" // This is likely a solution or app logo, so keep it multi-color
        title={title}
        body={body}
        actions={rightSideItems}
      />
    );
  } else if (pageHeader) {
    header = <EuiPageTemplate.Header {...pageHeader} />;
  }

  const classes = getClasses(template, className);
  return (
    <EuiPageTemplate className={classes} {...rest}>
      {header}
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
