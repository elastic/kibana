/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, ReactNode } from 'react';

import {
  EuiEmptyPrompt,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderProps,
  EuiPageSideBar,
  EuiPageTemplate,
  EuiPageTemplateProps,
} from '@elastic/eui';

export type KibanaPageLayoutProps = EuiPageTemplateProps & {
  globals?: boolean;
  solutionNav?: ReactNode;
  pageHeader?: EuiPageHeaderProps;
};

export const KibanaPageLayout: FunctionComponent<KibanaPageLayoutProps> = ({
  template,
  pageHeader,
  globals = false,
  solutionNav,
  children,
  restrictWidth = true,
  pageContentProps = {},
  ...rest
}) => {
  const optionalSideBar = solutionNav;
  const optionalGlobals = globals && <></>;

  if (template === 'empty') {
    return (
      <EuiPageTemplate
        template="empty"
        restrictWidth={optionalGlobals ? false : restrictWidth}
        pageContentProps={pageContentProps}
        paddingSize={optionalGlobals ? 'none' : 'l'}
        pageSideBar={optionalSideBar}
        pageHeader={pageHeader}
        {...rest}
      >
        {optionalGlobals}
        {children}
      </EuiPageTemplate>
    );
  }

  if (optionalGlobals) {
    switch (template) {
      case 'centeredBody':
        return (
          <EuiPage grow={true} paddingSize={optionalGlobals ? 'none' : 'l'}>
            <EuiPageBody>
              {optionalGlobals}
              <EuiPageContent
                {...pageContentProps}
                verticalPosition="center"
                horizontalPosition="center"
                paddingSize="none"
              >
                <EuiEmptyPrompt
                  iconType={pageHeader?.iconType}
                  title={<h2>{pageHeader?.pageTitle}</h2>}
                  body={<p>{pageHeader?.description}</p>}
                  actions={pageHeader?.rightSideItems}
                />
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        );

      default:
        return (
          <EuiPage paddingSize="none">
            <EuiPageSideBar sticky>{optionalSideBar}</EuiPageSideBar>

            <EuiPageBody panelled paddingSize="none" restrictWidth={false}>
              {optionalGlobals}
              <EuiPageHeader restrictWidth={restrictWidth} paddingSize="l" {...pageHeader} />

              <EuiPageContent
                {...pageContentProps}
                hasBorder={false}
                hasShadow={false}
                paddingSize="l"
                color="transparent"
                borderRadius="none"
              >
                <EuiPageContentBody restrictWidth={restrictWidth}>{children}</EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        );
    }
  }

  /**
   * An easy way to create the right content for empty pages
   */
  let emptyPrompt;
  if (template === 'centeredBody' && pageHeader) {
    emptyPrompt = (
      <EuiEmptyPrompt
        iconType={pageHeader.iconType}
        title={<h2>{pageHeader.pageTitle}</h2>}
        body={<p>{pageHeader.description}</p>}
        actions={pageHeader.rightSideItems}
      />
    );
    pageHeader = undefined;
  }

  /**
   * When the globals don't exist, can just use the EuiPageTemplate
   */
  return (
    <EuiPageTemplate
      template={template}
      pageContentProps={pageContentProps}
      pageSideBar={optionalSideBar}
      pageHeader={pageHeader}
      restrictWidth={restrictWidth}
      {...rest}
    >
      {emptyPrompt}
      {children}
    </EuiPageTemplate>
  );
};
