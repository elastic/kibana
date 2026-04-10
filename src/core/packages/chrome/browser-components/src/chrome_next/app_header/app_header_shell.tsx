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
import { useReportTopBarHeight } from './hooks';

/** Minimum row height; aligns with project layout `applicationTopBarHeight`. */
const APPLICATION_TOP_BAR_HEIGHT_PX = 48;

export interface AppHeaderShellProps {
  leading?: ReactNode;
  title?: ReactNode;
  badges?: ReactNode;
  titleActions?: ReactNode;
  trailing?: ReactNode;
  metadata?: ReactNode;
  callout?: ReactNode;
  tabs?: ReactNode;
}

const useHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: ${APPLICATION_TOP_BAR_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 0 ${euiTheme.size.s};
      background: ${euiTheme.colors.backgroundBasePlain};
      border-bottom: ${euiTheme.border.thin};
      margin-bottom: -${euiTheme.border.width.thin};
    `;

    const primaryRow = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-width: 0;
      min-height: ${APPLICATION_TOP_BAR_HEIGHT_PX}px;
    `;

    const titleCluster = css`
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    `;

    const titleGroup = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    `;

    const titleClusterSpacer = css`
      flex: 1 1 auto;
      min-width: 0;
    `;

    const metadataRow = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      padding-bottom: ${euiTheme.size.s};
    `;

    const calloutRow = css`
      padding-bottom: ${euiTheme.size.s};
    `;

    const tabsRow = css`
      display: flex;
      align-items: stretch;
    `;

    return {
      root,
      primaryRow,
      titleCluster,
      titleGroup,
      titleClusterSpacer,
      metadataRow,
      calloutRow,
      tabsRow,
    };
  }, [euiTheme]);
};

export const AppHeaderShell = React.memo<AppHeaderShellProps>(
  ({ leading, title, badges, titleActions, trailing, metadata, callout, tabs }) => {
    const styles = useHeaderStyles();
    const heightRef = useReportTopBarHeight();

    return (
      <div ref={heightRef} css={styles.root} data-test-subj="chromeNextAppHeader">
        <div css={styles.primaryRow}>
          {leading}
          <div css={styles.titleCluster}>
            <div css={styles.titleGroup}>
              {title}
              {badges}
              {titleActions}
            </div>
            <div css={styles.titleClusterSpacer} aria-hidden />
          </div>
          {trailing}
        </div>
        {metadata && (
          <div css={styles.metadataRow} data-test-subj="chromeNextAppHeaderMetadata">
            {metadata}
          </div>
        )}
        {callout && (
          <div css={styles.calloutRow} data-test-subj="chromeNextAppHeaderCallout">
            {callout}
          </div>
        )}
        {tabs && (
          <div css={styles.tabsRow} data-test-subj="chromeNextAppHeaderTabs">
            {tabs}
          </div>
        )}
      </div>
    );
  }
);

AppHeaderShell.displayName = 'AppHeaderShell';
