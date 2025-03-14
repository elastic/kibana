/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { HTMLAttributes, useEffect } from 'react';
import { css } from '@emotion/react';
import { css as cssString } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import { getTabsShadowGradient } from './get_tabs_shadow_gradient';

const globalCss = cssString`
  overscroll-behavior: none;

  #kbnHeaderSecondBar,
  [data-test-subj='kibanaProjectHeaderActionMenu'] {
    box-shadow: none;
    border-bottom: none;
    border-block-end: none;
  }
`;

export interface TabsBarWithBackgroundProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const TabsBarWithBackground: React.FC<TabsBarWithBackgroundProps> = ({
  children,
  ...otherProps
}) => {
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
      {...otherProps}
      // tabs bar background
      css={css`
        background: ${euiTheme.colors.lightestShade};

        .kbnBody--hasProjectActionMenu & {
          margin-top: 1px; // for some reason the header slightly overlaps the tabs bar in a solution view
        }
      `}
    >
      <div
        // top shadow for tabs bar
        css={css`
          background: ${getTabsShadowGradient(euiThemeContext)};
        `}
      >
        {children}
      </div>
    </div>
  );
};
