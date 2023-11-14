/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';

/**
 * Shared functions for share modal components
 */

export interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
}

export const makeUrlEmbeddable = (url: string): string => {
  const embedParam = '?embed=true';
  const urlHasQueryString = url.indexOf('?') !== -1;

  if (urlHasQueryString) {
    return url.replace('?', `${embedParam}&`);
  }

  return `${url}${embedParam}`;
};

export const makeIframeTag = (url?: string) => {
  if (!url) {
    return;
  }

  return `<iframe src="${url}" height="600" width="800"></iframe>`;
};

export const renderWithIconTip = (child: React.ReactNode, tipContent: React.ReactNode) => {
  return (
    <EuiFlexGroup gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false}>{child}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip content={tipContent} position="bottom" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
