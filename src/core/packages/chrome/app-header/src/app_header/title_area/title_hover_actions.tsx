/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';

const EDIT_TITLE_ARIA_LABEL = i18n.translate('core.ui.chrome.appHeader.editTitleAriaLabel', {
  defaultMessage: 'Edit title',
});

export interface TitleHoverActionsProps {
  favorite?: ReactNode;
  onEditTitle?: () => void;
}

export const TitleHoverActions = React.memo<TitleHoverActionsProps>(({ favorite, onEditTitle }) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(() => {
    const iconButton = css`
      color: ${euiTheme.colors.textSubdued};
    `;

    const favoriteSlot = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;

      .euiButtonIcon {
        color: ${euiTheme.colors.textSubdued};
        block-size: 24px;
        inline-size: 24px;
      }
    `;

    const overlay = css`
      position: absolute;
      inset-block: 0;
      inset-inline-end: 0;
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xxs};
      padding-inline: ${euiTheme.size.l} ${euiTheme.size.xxs};
      opacity: 0;
      pointer-events: none;
      transition: opacity ${euiTheme.animation.fast} ease;
      background: linear-gradient(
        to right,
        transparent,
        ${euiTheme.colors.backgroundBasePlain} ${euiTheme.size.m}
      );
    `;

    return { iconButton, favoriteSlot, overlay };
  }, [euiTheme]);

  if (!favorite && !onEditTitle) {
    return null;
  }

  return (
    <div css={styles.overlay} className="titleHoverActions" data-test-subj="appHeaderTitleHoverActions">
      {favorite ? (
        <div css={styles.favoriteSlot} data-test-subj="appHeaderFavorite">
          {favorite}
        </div>
      ) : null}
      {onEditTitle ? (
        <EuiToolTip content={EDIT_TITLE_ARIA_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="pencil"
            color="text"
            display="empty"
            size="xs"
            css={styles.iconButton}
            aria-label={EDIT_TITLE_ARIA_LABEL}
            data-test-subj="appHeaderEditTitle"
            onClick={onEditTitle}
          />
        </EuiToolTip>
      ) : null}
    </div>
  );
});

TitleHoverActions.displayName = 'TitleHoverActions';

export const useTitleHoverHostStyles = () => {
  return useMemo(
    () => css`
      position: relative;
      flex: 0 1 auto;
      min-inline-size: 0;
      max-inline-size: 100%;

      &:hover .titleHoverActions,
      &:focus-within .titleHoverActions {
        opacity: 1;
        pointer-events: auto;
      }
    `,
    []
  );
};
