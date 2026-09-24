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
import { Title, getNoBackTitleOffset, isEditableTitle } from './title';

export interface TitleAreaProps {
  title?: string | AppHeaderEditableTitle;
  back?: AppHeaderBack | AppHeaderBack[];
  size?: 'xs' | 's';
  /**
   * Rendered in the title slot when no title is provided, so loading placeholders
   * share the same gap and offset as a real title.
   */
  placeholder?: ReactNode;
  /**
   * Compact headers apply a no-back title offset so the title clears a rounded
   * workspace corner. Does not apply for standard spacing or when a back button
   * is present.
   */
  compact?: boolean;
}

export const TitleArea = React.memo<TitleAreaProps>(
  ({ title, back, size, placeholder, compact }) => {
    const { euiTheme } = useEuiTheme();
    const backTargets = toBackTargets(back);
    const hasBack = backTargets.length > 0;
    const showTitle = !!title && (isEditableTitle(title) || title.length > 0);
    const showPlaceholder = !showTitle && placeholder != null;
    const applyNoBackOffset = !hasBack && !!compact;

    const styles = useMemo(() => {
      const wrapper = css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        flex: 0 1 auto;
        min-width: 0;
        max-width: 100%;
      `;

      // Same inset `Title` applies for compact no-back headers, so a lone placeholder
      // lines up with where the title text sits.
      const noBackOffset = getNoBackTitleOffset(euiTheme, compact);
      const placeholderOffset = noBackOffset
        ? css`
            padding-inline-start: ${noBackOffset};
          `
        : undefined;

      return { wrapper, placeholderOffset };
    }, [compact, euiTheme]);

    if (!showTitle && !hasBack && !showPlaceholder) {
      return null;
    }

    return (
      <div css={styles.wrapper}>
        {hasBack && <BackButton targets={backTargets} />}
        {showTitle && title && (
          <Title title={title} titleOffset={applyNoBackOffset} size={size} compact={compact} />
        )}
        {showPlaceholder && (
          <div css={applyNoBackOffset ? styles.placeholderOffset : undefined}>{placeholder}</div>
        )}
      </div>
    );
  }
);

TitleArea.displayName = 'TitleArea';
