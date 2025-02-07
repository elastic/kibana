/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { EmotionFn } from '../types';

const root: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  z-index: ${euiTheme.levels.navigation};
  grid-area: navigation;
  height: var(--kbnWorkspace--navigation-height, 100vh);
  width: var(--kbnWorkspace--navigation-width, 0);
  top: var(--kbnWorkspace--navigation-top, 0);
  align-self: start;

  & .euiCollapsibleNavButtonWrapper {
    display: none;
  }

  & .euiCollapsibleNavBeta {
    left: 0;

    .euiCollapsibleNavLink svg {
      transform: scale(1);
    }

    .euiCollapsibleNavGroup__children .euiSpacer:first-child {
      display: none;
    }

    .sideNavPanel {
      background-color: ${euiTheme.colors.backgroundBasePlain};
      margin-top: 1px;
      border-top-left-radius: ${euiTheme.border.radius.medium};
    }
  }

  & .euiCollapsibleNav__footer {
    border-top: none;
    position: relative;

    :after {
      content: '';
      display: block;
      border-top: 1px solid ${euiTheme.border.color};
      position: absolute;
      top: 0;
      left: ${euiTheme.size.s};
      right: ${euiTheme.size.s};
      height: 1px;
    }
  }
`;

const content = css`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  clip-path: none;
`;

export const styles = {
  content,
  root,
};
