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

import {
  EuiAvatar,
  EuiEmptyPrompt,
  EuiPageTemplate,
  EuiPageTemplateProps,
  EuiTitle,
  IconType,
  EuiTitleProps,
} from '@elastic/eui';

export interface KibanaPageTemplateSolution extends Omit<EuiTitleProps, 'children'> {
  /**
   * Name of the solution, i.e. "Observability"
   */
  name: string;
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon?: IconType;
}

export type KibanaPageTemplateProps = EuiPageTemplateProps & {
  /**
   * Changes the template type depending on other props provided.
   * With `pageHeader` only: Uses `centeredBody` and fills an EuiEmptyPrompt with `pageHeader` info.
   * With `children` only: Uses `centeredBody`
   * With `pageHeader` and `children`: Uses `centeredContent`
   */
  isEmptyState?: boolean;
  /**
   * When adding `pageSideBar`, we encourage providing solution information to create a solution nav title
   */
  solution?: KibanaPageTemplateSolution;
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
  solution,
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
   * Solution navigation requires a logo and solution name
   */
  if (pageSideBar && solution) {
    const { name, icon, ...solutionRest } = solution;
    pageSideBar = (
      <>
        <EuiTitle size="xs" {...solutionRest} className="kbnPageTemplate__solutionNavTitle">
          <h2>
            {icon && (
              <EuiAvatar
                color="plain"
                iconType={icon}
                name={name}
                className="kbnPageTemplate__solutionNavTitleIcon"
              />
            )}
            <strong>{name}</strong>
          </h2>
        </EuiTitle>
        {pageSideBar}
      </>
    );
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
        className: classNames('kbnPageTemplate__pageSideBar', rest.pageSideBarProps?.className),
        ...rest.pageSideBarProps,
      }}
      {...localBottomBarProps}
      {...rest}
    >
      {children}
    </EuiPageTemplate>
  );
};
