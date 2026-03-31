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
import { ShareGlobalAction } from './global_actions/share';
import { useNextHeader } from '../shared/chrome_hooks';

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
 * Fixed-order global object actions (editTitle, share, favorite) next to the Chrome-Next title.
 * Only renders actions the page opts into via `chrome.next.header.set({ globalActions })`.
 *
 * Favorite is a `ReactNode` slot so plugins own full behavior (clients, context, React Query).
 */
export const ProjectNextGlobalActions = React.memo(() => {
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
    <div css={styles.root} data-test-subj="chromeProjectNextHeaderGlobalActions">
      {/* TODO: editTitle — Chrome-controlled inline title editor; wire onSave from config */}
      {share ? <ShareGlobalAction share={share} /> : null}
      {favorite ? (
        <div css={styles.favoriteSlot} data-test-subj="chromeProjectNextHeaderGlobalFavoriteSlot">
          {favorite}
        </div>
      ) : null}
    </div>
  );
});

ProjectNextGlobalActions.displayName = 'ProjectNextGlobalActions';
