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
import { useNextHeader } from '../shared/chrome_hooks';

const EDIT_TITLE_ARIA_LABEL = i18n.translate(
  'core.ui.chrome.projectNextHeader.globalEditTitleAriaLabel',
  {
    defaultMessage: 'Edit title',
  }
);

const SHARE_ARIA_LABEL = i18n.translate('core.ui.chrome.projectNextHeader.globalShareAriaLabel', {
  defaultMessage: 'Share',
});

const useGlobalActionsStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: ${euiTheme.size.xxs};
    `;

    const disabledTooltipAnchor = css`
      display: inline-block;
    `;

    const favoriteSlot = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
    `;

    return { root, disabledTooltipAnchor, favoriteSlot };
  }, [euiTheme]);
};

/**
 * Fixed-order global object actions (editTitle, share, favorite) next to the Chrome-Next title.
 * Only renders actions the page opts into via `chrome.next.header.set({ globalActions })`.
 *
 * Favorite is a `ReactNode` slot (not a star icon in core) so plugins own full behavior
 * (clients, context, React Query). That is separate from `chrome.setBreadcrumbsAppendExtension`,
 * which apps may use for the breadcrumb row in other layouts; see `ChromeNextHeaderConfig`.
 *
 * **editTitle** should eventually drive inline title editing; until then apps may use stub
 * callbacks (e.g. open settings).
 */
export const ProjectNextGlobalActions = React.memo(() => {
  const config = useNextHeader();
  const styles = useGlobalActionsStyles();
  const globalActions = config?.globalActions;

  if (!globalActions) {
    return null;
  }

  const { editTitle, share, favorite } = globalActions;

  if (!editTitle && !share && !favorite) {
    return null;
  }

  return (
    <div css={styles.root} data-test-subj="chromeProjectNextHeaderGlobalActions">
      {editTitle ? (
        <GlobalActionButton
          iconType="pencil"
          testSubj="chromeProjectNextHeaderGlobalEditTitle"
          ariaLabel={editTitle.ariaLabel ?? EDIT_TITLE_ARIA_LABEL}
          disabled={Boolean(editTitle.disabled)}
          onClick={editTitle.onClick}
          tooltipContent={editTitle.tooltipContent}
          disabledTooltipAnchorCss={styles.disabledTooltipAnchor}
        />
      ) : null}
      {share ? (
        <GlobalActionButton
          iconType="share"
          testSubj="chromeProjectNextHeaderGlobalShare"
          ariaLabel={share.ariaLabel ?? SHARE_ARIA_LABEL}
          disabled={Boolean(share.disabled)}
          onClick={share.onClick}
          tooltipContent={share.tooltipContent}
          disabledTooltipAnchorCss={styles.disabledTooltipAnchor}
        />
      ) : null}
      {favorite ? (
        <div css={styles.favoriteSlot} data-test-subj="chromeProjectNextHeaderGlobalFavoriteSlot">
          {favorite}
        </div>
      ) : null}
    </div>
  );
});

const GlobalActionButton = React.memo(
  ({
    iconType,
    testSubj,
    ariaLabel,
    disabled,
    onClick,
    tooltipContent,
    disabledTooltipAnchorCss,
  }: {
    iconType: 'pencil' | 'share';
    testSubj: string;
    ariaLabel: string;
    disabled: boolean;
    onClick: () => void;
    tooltipContent?: string;
    disabledTooltipAnchorCss: ReturnType<typeof css>;
  }) => {
    const button = (
      <EuiButtonIcon
        iconType={iconType}
        display="empty"
        size="s"
        aria-label={ariaLabel}
        data-test-subj={testSubj}
        disabled={disabled}
        onClick={onClick}
      />
    );

    if (!tooltipContent) {
      return button;
    }

    if (disabled) {
      return (
        <EuiToolTip content={tooltipContent}>
          <span css={disabledTooltipAnchorCss} tabIndex={0}>
            {button}
          </span>
        </EuiToolTip>
      );
    }

    return <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>;
  }
);

GlobalActionButton.displayName = 'GlobalActionButton';
