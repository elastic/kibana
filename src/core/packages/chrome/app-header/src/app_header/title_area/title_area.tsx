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
import type { AppHeaderBack, AppHeaderEditableTitle } from '../../types';
import { useBackNavTargets } from '../hooks';
import { BackButton } from '../back_button';
import { Title, isEditableTitle } from './title';

export interface TitleAreaProps {
  title?: string | AppHeaderEditableTitle;
  back?: AppHeaderBack | AppHeaderBack[];
  size?: 'xs' | 's';
}

export const TitleArea = React.memo<TitleAreaProps>(({ title, back, size }) => {
  const { euiTheme } = useEuiTheme();
  const backTargets = useBackNavTargets(back);
  const hasBack = backTargets.length > 0;
  const showTitle = !!title && (isEditableTitle(title) || title.length > 0);

  const wrapper = useMemo(
    () => css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    `,
    [euiTheme]
  );

  if (!showTitle && !hasBack) {
    return null;
  }

  return (
    <div css={wrapper}>
      {hasBack && <BackButton targets={backTargets} />}
      {title && <Title title={title} titleOffset={!hasBack} size={size} />}
    </div>
  );
});

TitleArea.displayName = 'TitleArea';
