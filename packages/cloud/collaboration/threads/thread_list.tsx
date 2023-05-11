/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ThreadList as Component, ThreadListReactComponentProps } from '@cord-sdk/react';
import { css } from '@emotion/react';

export interface Props extends Pick<ThreadListReactComponentProps, 'onThreadClick'> {
  application: string;
  savedObjectId: string;
  className?: string;
}

export const ThreadList = ({ onThreadClick, application, savedObjectId, className }: Props) => {
  const pageId = `${application}-${savedObjectId}`;
  const location = { page: pageId };

  const componentCSS = css`
    --cord-thread-list-padding: 0;
  `;

  return <Component className={className} css={componentCSS} {...{ location, onThreadClick }} />;
};
