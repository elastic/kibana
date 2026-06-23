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
import type { MouseEvent as ReactMouseEvent } from 'react';
import React, { useMemo } from 'react';
import type { ShareAction } from './hooks';

const SHARE_ARIA_LABEL = i18n.translate('core.ui.chrome.appHeader.shareAriaLabel', {
  defaultMessage: 'Share',
});

const useTitleActionsStyles = () => {
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

    return { root, iconButton };
  }, [euiTheme]);
};

export interface TitleActionsProps {
  shareAction?: ShareAction;
}

export const TitleActions = React.memo<TitleActionsProps>(({ shareAction }) => {
  const styles = useTitleActionsStyles();

  if (!shareAction) {
    return null;
  }

  const shareTooltipContent = shareAction?.tooltipContent ?? SHARE_ARIA_LABEL;
  const hasCustomTooltip = !!shareAction?.tooltipContent || !!shareAction?.tooltipTitle;

  return (
    <div css={styles.root} data-test-subj="appHeaderTitleActions">
      <EuiToolTip
        content={shareTooltipContent}
        title={shareAction.tooltipTitle}
        {...(!hasCustomTooltip && { disableScreenReaderOutput: true })}
      >
        <EuiButtonIcon
          iconType="share"
          color="text"
          display="empty"
          size="xs"
          css={styles.iconButton}
          aria-label={SHARE_ARIA_LABEL}
          isDisabled={shareAction.isDisabled}
          data-test-subj={`appHeaderShare ${shareAction.testId ?? ''}`.trim()}
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) =>
            shareAction.onClick(event.currentTarget)
          }
        />
      </EuiToolTip>
    </div>
  );
});

TitleActions.displayName = 'TitleActions';
