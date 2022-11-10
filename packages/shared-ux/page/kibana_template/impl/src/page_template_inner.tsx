/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useState } from 'react';
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

const KIBANA_CHROME_SELECTOR = '[data-test-subj="kibanaChrome"]';
const HEADER_GLOBAL_NAV_SELECTOR = '[data-test-subj="headerGlobalNav"]';

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
  ...rest
}) => {
  let header;

  const [offset, setOffset] = useState<number | undefined>();

  useEffect(() => {
    const kibanaChrome = document.querySelector(KIBANA_CHROME_SELECTOR) as HTMLElement;
    if (kibanaChrome) {
      const kibanaChromeHeader = kibanaChrome.querySelector(
        HEADER_GLOBAL_NAV_SELECTOR
      ) as HTMLElement;
      setOffset(kibanaChromeHeader?.offsetTop + kibanaChromeHeader?.offsetHeight);
    }
  }, []);

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

  let sideBar;
  if (pageSideBar) {
    const sideBarProps = { ...pageSideBarProps };
    if (offset) {
      sideBarProps.sticky = { offset };
    }
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
      minHeight={0}
      {...rest}
    >
      {sideBar}
      {header}
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
