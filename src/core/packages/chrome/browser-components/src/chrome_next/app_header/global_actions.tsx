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
import React, { useMemo } from 'react';
import { useNextHeader } from '../../shared/chrome_hooks';
import { useShareAction } from './hooks';

const SHARE_ARIA_LABEL = i18n.translate('core.ui.chrome.appHeader.globalShareAriaLabel', {
  defaultMessage: 'Share',
});

const useGlobalActionsStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

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

    return { root, iconButton, favoriteSlot };
  }, [euiTheme]);
};

/**
 * Fixed-order global object actions (editTitle, share, favorite) next to the title.
 * Share is auto-extracted from the app menu (item with id 'share') or explicitly set
 * via `chrome.next.header.set({ globalActions: { share } })`.
 * Favorite is a `ReactNode` slot so plugins own full behavior (clients, context, React Query).
 */
export const GlobalActions = React.memo(() => {
  const config = useNextHeader();
  const styles = useGlobalActionsStyles();
  const shareAction = useShareAction();
  const favorite = config?.globalActions?.favorite;

  if (!shareAction && !favorite) {
    return null;
  }

  const shareTooltipContent = shareAction?.tooltipContent ?? SHARE_ARIA_LABEL;
  const hasCustomTooltip = !!shareAction?.tooltipContent || !!shareAction?.tooltipTitle;

  return (
    <div css={styles.root} data-test-subj="chromeNextAppHeaderGlobalActions">
      {shareAction ? (
        <EuiToolTip
          content={shareTooltipContent}
          title={shareAction.tooltipTitle}
          delay="long"
          {...(!hasCustomTooltip && { disableScreenReaderOutput: true })}
        >
          <EuiButtonIcon
            iconType="share"
            color="text"
            display="empty"
            size="xs"
            css={styles.iconButton}
            aria-label={SHARE_ARIA_LABEL}
            data-test-subj={`chromeNextAppHeaderGlobalShare ${shareAction.testId ?? ''}`.trim()}
            onClick={shareAction.onClick}
          />
        </EuiToolTip>
      ) : null}
      {favorite ? (
        <div css={styles.favoriteSlot} data-test-subj="chromeNextAppHeaderGlobalFavoriteSlot">
          {favorite}
        </div>
      ) : null}
    </div>
  );
});

GlobalActions.displayName = 'GlobalActions';
