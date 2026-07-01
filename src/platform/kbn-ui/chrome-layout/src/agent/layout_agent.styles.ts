/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { layoutVar, layoutLevels } from '@kbn/ui-chrome-layout-constants';
import { euiOverflowScroll, euiShadow, type UseEuiTheme } from '@elastic/eui';
import { getHighContrastBorder } from '@kbn/ui-chrome-layout-utils';
import type { ChromeStyle } from '../layout.types';
import type { EmotionFn } from '../types';

const shell = (): EmotionFn => {
  return () =>
    css`
      grid-area: agent;

      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      );
      margin-top: ${layoutVar('application.marginTop')};
      margin-bottom: ${layoutVar('application.marginBottom')};
      margin-right: ${layoutVar('application.marginRight')};
      margin-left: ${layoutVar('agent.marginLeft', '0px')};

      z-index: ${layoutLevels.content};

      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
    `;
};

const panel = (chromeStyle: ChromeStyle = 'classic'): EmotionFn => {
  const isProjectStyle = chromeStyle === 'project';

  return (useEuiTheme: UseEuiTheme) => {
    return css`
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      min-width: 0;
      width: 100%;
      height: 100%;

      ${isProjectStyle &&
      css`
        background-color: ${useEuiTheme.euiTheme.colors.backgroundBasePlain};
        border-radius: ${useEuiTheme.euiTheme.border.radius.medium};
        outline: ${getHighContrastBorder(useEuiTheme)};
        ${euiShadow(useEuiTheme, 'xs', { border: 'none' })};
      `}
      ${!isProjectStyle &&
      css`
        background-color: transparent;
        border-radius: 0;
        border: none;
      `}

      &:focus-visible {
        border: 2px solid ${useEuiTheme.euiTheme.colors.textParagraph};
      }

      @media screen {
        ${euiOverflowScroll(useEuiTheme, { direction: 'y' })};
        height: calc(
          100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
        );
      }
    `;
  };
};

/** Fade content out before width collapse so panel UI is not squished during the tween. */
export const CONTENT_FADE_MS = 120;

const content: EmotionFn = () => css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
`;

export const contentHiddenStyles = css`
  visibility: hidden;
  pointer-events: none;
`;

export const styles = {
  shell,
  panel,
  content,
};
