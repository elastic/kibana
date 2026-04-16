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
import { ProjectNextBackButton } from './back_button';
import { ProjectNextGlobalActions } from './global_actions';
import { useReportTopBarHeight } from './hooks';
import { ProjectNextTitle } from './title';
import { ProjectNextTrailingActions } from './trailing_actions';

/** Application top bar height; aligns with project layout `applicationTopBarHeight`. */
const APPLICATION_TOP_BAR_HEIGHT_PX = 48;

const useHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
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
      flex: 1;
      min-height: 0;
    `;

    const titleCluster = css`
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    `;

    /**
     * Keeps the title and global actions grouped on the left; the title truncates with ellipsis
     * instead of growing and pushing icons toward the app menu (trailing) region.
     */
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

    return { root, primaryRow, titleCluster, titleGroup, titleClusterSpacer };
  }, [euiTheme]);
};

export const ProjectNextHeader = React.memo(() => {
  const styles = useHeaderStyles();
  const heightRef = useReportTopBarHeight();

  return (
    <div ref={heightRef} css={styles.root} data-test-subj="chromeProjectNextHeader">
      <div css={styles.primaryRow}>
        <ProjectNextBackButton />
        <div css={styles.titleCluster}>
          <div css={styles.titleGroup}>
            <ProjectNextTitle />
            <ProjectNextGlobalActions />
          </div>
          <div css={styles.titleClusterSpacer} aria-hidden />
        </div>
        <ProjectNextTrailingActions />
      </div>
    </div>
  );
});

ProjectNextHeader.displayName = 'ProjectNextHeader';
