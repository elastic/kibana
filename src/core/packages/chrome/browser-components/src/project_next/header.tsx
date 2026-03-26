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
import { useReportTopBarHeight } from './hooks';
import { ProjectNextTitle } from './title';
import { ProjectNextTrailingActions } from './trailing_actions';

const useHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: ${euiTheme.size.s};
      background: ${euiTheme.colors.backgroundBasePlain};
      border-bottom: ${euiTheme.border.thin};
      margin-bottom: -${euiTheme.border.width.thin};
    `;

    const primaryRow = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-width: 0;
    `;

    return { root, primaryRow };
  }, [euiTheme]);
};

export const ProjectNextHeader = React.memo(() => {
  const styles = useHeaderStyles();
  const heightRef = useReportTopBarHeight();

  return (
    <div ref={heightRef} css={styles.root} data-test-subj="chromeProjectNextHeader">
      <div css={styles.primaryRow}>
        <ProjectNextBackButton />
        <ProjectNextTitle />
        <ProjectNextTrailingActions />
      </div>
    </div>
  );
});
