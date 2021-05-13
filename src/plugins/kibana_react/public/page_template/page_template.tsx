/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt, EuiPageTemplate, EuiPageTemplateProps } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

export type KibanaPageTemplateProps = EuiPageTemplateProps & {
  /**
   * Changes the template type depending on other props provided.
   * With `pageHeader` only: Uses `centeredBody` and fills an EuiEmptyPrompt with `pageHeader` info.
   * With `children` only: Uses `centeredBody`
   * With `pageHeader` and `children`: Uses `centeredContent`
   */
  isEmptyState?: boolean;
};

export const KibanaPageTemplate: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
  pageHeader,
  children,
  isEmptyState,
  restrictWidth = true,
  bottomBar,
  bottomBarProps,
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
   * An easy way to create the right content for empty pages
   */
  if (isEmptyState && pageHeader && !children) {
    template = template ?? 'centeredBody';
    const { iconType, pageTitle, description, rightSideItems } = pageHeader;
    pageHeader = undefined;
    children = (
      <EuiEmptyPrompt
        iconType={iconType}
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
      pageHeader={pageHeader}
      restrictWidth={restrictWidth}
      {...localBottomBarProps}
      {...rest}
    >
      {children}
    </EuiPageTemplate>
  );
};
