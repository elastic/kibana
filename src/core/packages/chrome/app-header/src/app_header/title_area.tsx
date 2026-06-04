/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { AppHeaderBack } from '../types';
import { useBackNavTargets } from './hooks';
import { BackButton } from './back_button';

export interface TitleAreaProps {
  title?: string;
  back?: AppHeaderBack | AppHeaderBack[];
}

export const TitleArea = React.memo<TitleAreaProps>(({ title, back }) => {
  const { euiTheme } = useEuiTheme();
  const backTargets = useBackNavTargets(back);
  const hasBack = backTargets.length > 0;

  const styles = useMemo(() => {
    const wrapper = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.m};
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    `;

    const titleOffset = css`
      padding-left: ${euiTheme.size.xs};
    `;

    return { wrapper, titleOffset };
  }, [euiTheme]);

  if (!title && !hasBack) {
    return null;
  }

  return (
    <div css={styles.wrapper}>
      {hasBack && <BackButton targets={backTargets} />}
      {title && (
        <EuiTitle size="s" css={!hasBack ? styles.titleOffset : undefined}>
          <h1 className="eui-textTruncate">{title}</h1>
        </EuiTitle>
      )}
    </div>
  );
});

TitleArea.displayName = 'TitleArea';
