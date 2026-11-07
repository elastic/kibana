/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import classNames from 'classnames';
import { EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  KBN_RECESSED_GLASS_CLASS,
  kbnRecessedGlassCss,
} from '@kbn/css-utils/public/recessed_glass_css';

import { withSolutionNav } from '@kbn/shared-ux-page-solution-nav';
import type { KibanaPageTemplateProps as Props } from '@kbn/shared-ux-page-kibana-template-types';

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
  const euiThemeContext = useEuiTheme();
  let header;

  if (isEmptyState && pageHeader && !children) {
    const { iconType, pageTitle, description, rightSideItems } = pageHeader;
    const title = pageTitle ? <h1>{pageTitle}</h1> : undefined;
    const body = description ? <p>{description}</p> : undefined;
    children = (
      <EuiPageTemplate.EmptyPrompt
        iconType={iconType}
        iconColor="" // This is likely a solution or app logo, so keep it multi-color
        // POC: lifts the prompt off the recessed glass empty-state surface; shadow requires no border.
        hasShadow
        hasBorder={false}
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
    // TODO: instead of using sticky = true here, we reproduce the same behavior to account for both legacy fixed layout and new grid layout.
    // https://github.com/elastic/eui/issues/8820
    sideBarProps.style = {
      maxHeight: 'var(--kbn-application--content-height, 100vh)',
      top: 'var(--euiFixedHeadersOffset, 0px)',
      position: 'sticky',
    };
    sideBarProps.sticky = false; // This is a temporary fix to avoid the sidebar being incorrectly sticky in the new grid layout.

    sideBar = <EuiPageTemplate.Sidebar {...sideBarProps}>{pageSideBar}</EuiPageTemplate.Sidebar>;
  }

  const classes = getClasses(
    undefined,
    classNames(className, { [KBN_RECESSED_GLASS_CLASS]: isEmptyState })
  );

  return (
    <EuiPageTemplate
      className={classes}
      // Note: Once all pages have been converted to this new component,
      // the following props can be removed to allow the template to auto-handle
      // the fixed header and banner heights.
      offset={0}
      minHeight={header ? 'var(--kbn-application--content-height)' : 0}
      grow={header ? false : undefined}
      // POC: empty states sit on the recessed glass surface; unpanelled so sections stay transparent.
      css={isEmptyState ? css(kbnRecessedGlassCss(euiThemeContext)) : undefined}
      panelled={isEmptyState ? false : undefined}
      {...rest}
    >
      {sideBar}
      {header}
      {children}
    </EuiPageTemplate>
  );
};

export const KibanaPageTemplateWithSolutionNav = withSolutionNav(KibanaPageTemplateInner);
