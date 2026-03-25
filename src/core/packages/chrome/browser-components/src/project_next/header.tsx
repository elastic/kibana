/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useReportTopBarHeight, useTitle } from './hooks';
import { ProjectNextAppMenu } from './app_menu';

const useStyles = (euiTheme: UseEuiTheme['euiTheme']) =>
  useMemo(() => {
    const root = css`
      display: flex;
      align-items: center;
      padding: ${euiTheme.size.s};
      background: ${euiTheme.colors.backgroundBasePlain};
      border-bottom: ${euiTheme.border.thin};
      margin-bottom: -${euiTheme.border.width.thin};
    `;

    const title = css`
      font-size: ${euiTheme.size.base};
      font-weight: ${euiTheme.font.weight.semiBold};
      line-height: ${euiTheme.size.l};
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    return { root, title };
  }, [euiTheme]);

export const ProjectNextHeader = React.memo(() => {
  const title = useTitle();
  const { euiTheme } = useEuiTheme();
  const styles = useStyles(euiTheme);
  const heightRef = useReportTopBarHeight();

  return (
    <div ref={heightRef} css={styles.root} data-test-subj="chromeProjectNextHeader">
      <h1 css={styles.title}>{title}</h1>
      <ProjectNextAppMenu />
    </div>
  );
});
