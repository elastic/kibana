/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  className,
  pageHeader,
  children,
  isEmptyState,
  pageSideBar,
  pageSideBarProps,
  emptyPageBody,
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

  // NOTE: with emptyPageBody, page contents are replaced entirely with the provided element
  if (isEmptyState && emptyPageBody) {
    children = emptyPageBody;
  }

  let sideBar;
  if (pageSideBar) {
    const sideBarProps = { ...pageSideBarProps };
    sideBarProps.sticky = true;
    sideBar = <EuiPageTemplate.Sidebar {...sideBarProps}>{pageSideBar}</EuiPageTemplate.Sidebar>;
  }

  const classes = getClasses(undefined, className);

  return (
    <EuiPageTemplate
      className={classes}
      // Note: Once all pages have been converted to this new component,
      // the following props can be removed to allow the template to auto-handle
      // the fixed header and banner heights.
      offset={0}
      minHeight={
        header ? 'calc(100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)))' : 0
      }
      grow={header ? false : undefined}
      {...rest}
    >
      {sideBar}
      {header}
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
