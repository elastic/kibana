/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { css as cssReact, SerializedStyles } from '@emotion/react';
import { zLevels } from '../../constants';

const globalCss = css`
  overscroll-behavior: none;

  #kbnHeaderSecondBar,
  [data-test-subj='kibanaProjectHeaderActionMenu'] {
    box-shadow: none;
    border-bottom: none;
    border-block-end: none;
  }
`;

interface UseTabGlueStylesProps {
  isSelected: boolean;
}

interface UseTabGlueStylesReturn {
  selectedTabBackgroundColor: string;
  tabBackground: React.ReactNode;
  tabBackgroundParentCss: SerializedStyles;
}

export const useTabsOverflow = ({ isSelected }: UseTabGlueStylesProps): UseTabGlueStylesReturn => {
  const { euiTheme } = useEuiTheme();
  const selectedTabBackgroundColor = document.querySelector(
    // TODO: listen to chromeStyle changes instead
    '.kbnBody--hasProjectActionMenu'
  )
    ? euiTheme.colors.body
    : euiTheme.colors.emptyShade;

  useEffect(() => {
    if (!isSelected) {
      return;
    }

    document.body.classList.add(globalCss);

    return () => {
      document.body.classList.remove(globalCss);
    };
  }, [isSelected]);

  return useMemo(() => {
    return {
      selectedTabBackgroundColor,
      tabBackground: (
        <div
          css={cssReact`
            display: block;
            position: absolute;
            top: ${isSelected ? `-${euiTheme.size.xs}` : 0};
            bottom: 0;
            right: 0;
            left: 0;
            background-color: ${
              isSelected ? selectedTabBackgroundColor : euiTheme.colors.lightestShade
            };
            transition: background-color ${euiTheme.animation.fast};
            z-index: ${
              isSelected
                ? zLevels.aboveHeaderShadowTabBackground
                : zLevels.belowHeaderShadowTabBackground
            };
            border-right: ${euiTheme.border.thin};
            border-color: ${euiTheme.colors.lightShade};
          `}
        />
      ),
      tabBackgroundParentCss: cssReact`
        position: relative;
      `,
    };
  }, [selectedTabBackgroundColor, isSelected, euiTheme]);
};
