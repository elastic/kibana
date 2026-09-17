/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import {
  euiOverflowScroll,
  euiShadow,
  highContrastModeStyles,
  type UseEuiTheme,
} from '@elastic/eui';
import { layoutVar, layoutLevels } from '../constants';
import type { LayoutAppearance } from '../layout.types';
import type { EmotionFn } from '../types';

const shell = (appearance: LayoutAppearance = 'plain'): EmotionFn => {
  const isFramedAppearance = appearance === 'framed';

  return (useEuiTheme: UseEuiTheme) => {
    const { euiTheme } = useEuiTheme;

    return css`
      grid-area: agent;

      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      );
      margin-top: ${layoutVar('application.marginTop')};
      margin-bottom: ${layoutVar('application.marginBottom')};
      margin-left: ${layoutVar('agent.marginLeft', '0px')};
      min-width: 0;
      min-height: 0;

      z-index: ${layoutLevels.content};
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      ${isFramedAppearance &&
      css`
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        ${euiShadow(useEuiTheme, 'xs', { border: 'none' })};
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseFloating};
      `}
      ${!isFramedAppearance &&
      css`
        background-color: transparent;
        border-radius: 0;
        border: none;
      `}
    `;
  };
};

const scrollContainer: EmotionFn = (useEuiTheme) => css`
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
  min-height: 0;

  @media screen {
    ${euiOverflowScroll(useEuiTheme, { direction: 'y' })};
  }

  &:focus-visible {
    outline: ${useEuiTheme.euiTheme.focus.width} solid ${useEuiTheme.euiTheme.focus.color};
    outline-offset: 0;

    ${highContrastModeStyles(useEuiTheme, {
      preferred: `outline-width: calc(${useEuiTheme.euiTheme.focus.width} * 2);`,
    })}
  }
`;

const content: EmotionFn = () => css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
  min-height: 0;
`;

export const styles = {
  shell,
  scrollContainer,
  content,
};
