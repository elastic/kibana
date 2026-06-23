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
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import type { AppHeaderBack, AppHeaderTitle } from '../../types';
import { useBackNavTargets } from '../hooks';
import { BackButton } from '../back_button';
import { Title, isEditableTitle, type TitleHandle } from './title';
import { TitleHoverActions, useTitleHoverHostStyles } from './title_hover_actions';

export interface TitleAreaProps {
  title?: AppHeaderTitle;
  back?: AppHeaderBack | AppHeaderBack[];
  size?: 'xs' | 's';
  onEditingChange?: (isEditing: boolean) => void;
  favorite?: ReactNode;
  onEditTitle?: () => void;
}

export type TitleAreaHandle = TitleHandle;

export const TitleArea = React.memo(
  React.forwardRef<TitleAreaHandle, TitleAreaProps>(
    ({ title, back, size, onEditingChange, favorite, onEditTitle }, ref) => {
      const { euiTheme } = useEuiTheme();
      const [isEditing, setIsEditing] = useState(false);
      const backTargets = useBackNavTargets(back);
      const hasBack = backTargets.length > 0;
      const showTitle = !!title && (isEditableTitle(title) || title.length > 0);
      const titleHoverHostStyles = useTitleHoverHostStyles();
      const showHoverActions = !isEditing && (!!favorite || !!onEditTitle);

      const handleEditingChange = useCallback(
        (editing: boolean) => {
          setIsEditing(editing);
          onEditingChange?.(editing);
        },
        [onEditingChange]
      );

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
          {title && (
            <div css={titleHoverHostStyles}>
              <Title
                ref={ref}
                title={title}
                titleOffset={!hasBack}
                size={size}
                onEditingChange={handleEditingChange}
              />
              {showHoverActions ? (
                <TitleHoverActions favorite={favorite} onEditTitle={onEditTitle} />
              ) : null}
            </div>
          )}
        </div>
      );
    }
  )
);

TitleArea.displayName = 'TitleArea';
