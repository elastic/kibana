/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useTitle } from './hooks';

const useTitleStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const title = css`
      flex: 1 1 auto;
      min-width: 0;
      font-size: ${euiTheme.size.base};
      font-weight: ${euiTheme.font.weight.semiBold};
      line-height: ${euiTheme.size.l};
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    return { title };
  }, [euiTheme]);
};

export const AppTitle = React.memo(() => {
  const title = useTitle();
  const styles = useTitleStyles();

  if (!title) {
    return null;
  }

  return <h1 css={styles.title}>{title}</h1>;
});

AppTitle.displayName = 'AppTitle';
