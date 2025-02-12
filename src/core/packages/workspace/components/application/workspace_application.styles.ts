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

const root =
  (shadow: string): EmotionFn =>
  ({ euiTheme }) =>
    css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      grid-area: app;
      height: var(--kbnWorkspace--application-height, 100vh);
      position: relative;
      border-top-left-radius: ${euiTheme.border.radius.medium};
      border-top-right-radius: ${euiTheme.border.radius.medium};
      border: 1px solid ${euiTheme.border.color};
      z-index: ${euiTheme.levels.content};
      ${shadow};
    `;

const content =
  (shadow: string): EmotionFn =>
  ({ euiTheme }) =>
    css`
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow-y: scroll;
      border-top-left-radius: ${euiTheme.border.radius.medium};
      border-top-right-radius: ${euiTheme.border.radius.medium};
      ${shadow};
    `;

export const styles = {
  root,
  content,
};
