/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { layoutVar, layoutLevels } from '@kbn/core-chrome-layout-constants';
import { euiOverflowScroll } from '@elastic/eui';
import type { EmotionFn } from '../types';

const root: EmotionFn = (useEuiTheme) =>
  css`
    grid-area: application;

    height: calc(100% - ${layoutVar('application.marginBottom')});
    width: calc(100% - ${layoutVar('application.marginRight')});
    margin-bottom: ${layoutVar('application.marginBottom')};
    margin-right: ${layoutVar('application.marginRight')};

    z-index: ${layoutLevels.content};

    position: relative;
    display: flex;
    flex-direction: column;

    &:focus-visible {
      border: 2px solid ${useEuiTheme.euiTheme.colors.textParagraph};
    }

    // only restrict overflow scroll on screen (not print) to allow for full page printing
    @media screen {
      ${euiOverflowScroll(useEuiTheme, { direction: 'y' })};
      // reset the height back to respect the margin bottom
      height: calc(100% - ${layoutVar('application.marginBottom')});
    }
  `;

const content: EmotionFn = () => css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const topBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  top: 0;
  z-index: ${layoutLevels.applicationTopBar};
  height: ${layoutVar('application.topBar.height')};
  flex-shrink: 0;
`;

const bottomBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  bottom: 0;
  z-index: ${layoutLevels.applicationBottomBar};
  height: ${layoutVar('application.bottomBar.height')};
  flex-shrink: 0;
`;

export const styles = {
  root,
  content,
  topBar,
  bottomBar,
};
