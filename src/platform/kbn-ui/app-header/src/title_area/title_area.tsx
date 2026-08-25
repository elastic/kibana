/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import type { AppHeaderBack, AppHeaderEditableTitle } from '../types';
import { toBackTargets } from '../to_back_targets';
import { BackButton } from '../back_button';
import { Title, isEditableTitle } from './title';

export interface TitleAreaProps {
  title?: string | AppHeaderEditableTitle;
  back?: AppHeaderBack | AppHeaderBack[];
  size?: 'xs' | 's';
  /**
   * Rendered in the title slot when no title is provided, so loading placeholders
   * share the same gap and offset as a real title.
   */
  placeholder?: ReactNode;
}

export const TitleArea = React.memo<TitleAreaProps>(({ title, back, size, placeholder }) => {
  const { euiTheme } = useEuiTheme();
  const backTargets = toBackTargets(back);
  const hasBack = backTargets.length > 0;
  const showTitle = !!title && (isEditableTitle(title) || title.length > 0);
  const showPlaceholder = !showTitle && placeholder != null;

  const styles = useMemo(() => {
    const wrapper = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    `;

    // Same inset `Title` applies when there is no back button, so a lone placeholder
    // lines up with where the title text sits.
    const placeholderOffset = css`
      padding-left: ${euiTheme.size.xs};
    `;

    return { wrapper, placeholderOffset };
  }, [euiTheme]);

  if (!showTitle && !hasBack && !showPlaceholder) {
    return null;
  }

  return (
    <div css={styles.wrapper}>
      {hasBack && <BackButton targets={backTargets} />}
      {showTitle && title && <Title title={title} titleOffset={!hasBack} size={size} />}
      {showPlaceholder && (
        <div css={!hasBack ? styles.placeholderOffset : undefined}>{placeholder}</div>
      )}
    </div>
  );
});

TitleArea.displayName = 'TitleArea';
