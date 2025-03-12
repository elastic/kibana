/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';
import { css as cssString } from '@emotion/css';
import { euiShadowXSmall, logicalCSS, useEuiTheme } from '@elastic/eui';
import { zLevels } from './constants';

const globalCss = cssString`
  overscroll-behavior: none;

  #kbnHeaderSecondBar,
  [data-test-subj='kibanaProjectHeaderActionMenu'] {
    box-shadow: none;
    border-bottom: none;
    border-block-end: none;
  }
`;

export interface TabsBarWithTopShadowProps {
  children: React.ReactNode;
}

export const TabsBarWithTopShadow: React.FC<TabsBarWithTopShadowProps> = ({ children }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  useEffect(() => {
    document.body.classList.add(globalCss);

    return () => {
      document.body.classList.remove(globalCss);
    };
  }, []);

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <div
        css={css`
          position: absolute;
          width: 100%;
          height: 0;
          z-index: ${zLevels.underHeaderShadow};
          ${logicalCSS('border-bottom', euiTheme.border.thin)}
          ${euiShadowXSmall(euiThemeContext)}

          .kbnBody--hasProjectActionMenu & {
            height: 2px;
          }
        `}
      />
      {children}
    </div>
  );
};
