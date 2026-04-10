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
import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from '@kbn/core-chrome-navigation';
import { useSideNavCollapsed } from '@kbn/core-chrome-browser-hooks';
import React, { useMemo } from 'react';

const GLOBAL_HEADER_HEIGHT_PX = 48;

export interface GlobalHeaderShellProps {
  logo?: ReactNode;
  switcher?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
}

const useGlobalHeaderStyles = (isNavCollapsed: boolean) => {
  const { euiTheme } = useEuiTheme();
  const logoWidth = isNavCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return useMemo(() => {
    const root = css`
      display: flex;
      align-items: center;
      height: ${GLOBAL_HEADER_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 0 ${euiTheme.size.s} 0 0;
      background: ${euiTheme.colors.backgroundTransparent};
    `;

    const leftGroup = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      flex-shrink: 0;
    `;

    const logoSlot = css`
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${logoWidth}px;
      height: ${GLOBAL_HEADER_HEIGHT_PX}px;
      flex-shrink: 0;
    `;

    const switcherSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
    `;

    const spacer = css`
      flex: 1 1 auto;
      min-width: 0;
    `;

    const rightGroup = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: ${euiTheme.size.s};
    `;

    const searchSlot = css`
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;

    const actionsSlot = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
    `;

    return { root, leftGroup, logoSlot, switcherSlot, spacer, rightGroup, searchSlot, actionsSlot };
  }, [euiTheme, logoWidth]);
};

export const GlobalHeaderShell = React.memo<GlobalHeaderShellProps>(
  ({ logo, switcher, search, actions }) => {
    const { isCollapsed } = useSideNavCollapsed();
    const styles = useGlobalHeaderStyles(isCollapsed);

    return (
      <header css={styles.root} data-test-subj="chromeNextGlobalHeader">
        <div css={styles.leftGroup}>
          <div css={styles.logoSlot}>{logo}</div>
          {switcher && (
            <div css={styles.switcherSlot} data-test-subj="chromeNextGlobalHeaderSwitcher">
              {switcher}
            </div>
          )}
        </div>
        <div css={styles.spacer} />
        <div css={styles.rightGroup}>
          {search && (
            <div css={styles.searchSlot} data-test-subj="chromeNextGlobalHeaderSearch">
              {search}
            </div>
          )}
          {actions && (
            <div css={styles.actionsSlot} data-test-subj="chromeNextGlobalHeaderActions">
              {actions}
            </div>
          )}
        </div>
      </header>
    );
  }
);

GlobalHeaderShell.displayName = 'GlobalHeaderShell';
