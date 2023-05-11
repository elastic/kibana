/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PagePresence } from '@cord-sdk/react';
import { css } from '@emotion/react';

export interface Props {
  application: string;
  savedObjectId: string;
}

export const BreadcrumbPresence = ({ application, savedObjectId }: Props) => {
  const style = css`
    margin-left: 8px;
    display: inline-block;
  `;

  const page = `${application}-${savedObjectId}`;

  return <PagePresence location={{ page }} css={style} />;
};
