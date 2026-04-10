/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useNextHeader } from '../../shared/chrome_hooks';

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

    const favoriteSlot = css`
      display: flex;
      flex-shrink: 0;
      align-items: center;
    `;

    return { root, favoriteSlot };
  }, [euiTheme]);
};

/**
 * Fixed-order global object actions (editTitle, share, favorite) next to the title.
 * Only renders actions the page opts into via `chrome.next.header.set({ globalActions })`.
 * Favorite is a `ReactNode` slot so plugins own full behavior (clients, context, React Query).
 */
export const GlobalActions = React.memo(() => {
  const config = useNextHeader();
  const styles = useGlobalActionsStyles();
  const globalActions = config?.globalActions;

  if (!globalActions) {
    return null;
  }

  const { share, favorite } = globalActions;

  if (!share && !favorite) {
    return null;
  }

  return (
    <div css={styles.root} data-test-subj="chromeNextAppHeaderGlobalActions">
      {/* TODO: editTitle — Chrome-controlled inline title editor; wire onSave from config */}
      {share ? (
        <EuiButtonIcon
          iconType="share"
          color="text"
          display="empty"
          size="s"
          aria-label={SHARE_ARIA_LABEL}
          data-test-subj="chromeNextAppHeaderGlobalShare"
          onClick={share.onClick}
        />
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
