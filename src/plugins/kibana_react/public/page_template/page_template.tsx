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
   * Disregards any `children` and renders an EuiEmptyPrompt filled with `pageHeader` items centered as the page body.
   */
  isEmptyScreen?: boolean;
  /**
   * Used in conjunction with `isEmptyScreen` to render a custom React element in place of EuiEmptyPrompt.
   */
  emptyPrompt?: JSX.Element;
};

export const KibanaPageTemplate: FunctionComponent<KibanaPageTemplateProps> = ({
  template,
  pageHeader,
  children,
  isEmptyScreen,
  emptyPrompt,
  restrictWidth = true,
  ...rest
}) => {
  /**
   * An easy way to create the right content for empty pages
   */
  if (isEmptyScreen) {
    const { iconType, pageTitle, description, rightSideItems } = pageHeader ?? {};
    template = 'centeredBody';
    pageHeader = undefined;
    emptyPrompt = emptyPrompt ?? (
      <EuiEmptyPrompt
        iconType={iconType}
        title={pageTitle ? <h1>{pageTitle}</h1> : undefined}
        body={description ? <p>{description}</p> : undefined}
        actions={rightSideItems}
      />
    );
  }

  return (
    <EuiPageTemplate
      template={template}
      pageHeader={pageHeader}
      restrictWidth={restrictWidth}
      {...rest}
    >
      {isEmptyScreen ? emptyPrompt : children}
    </EuiPageTemplate>
  );
};
