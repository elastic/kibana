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

const root: EmotionFn = ({ euiTheme }) =>
  css`
    grid-area: application;
    height: 100%;
    position: relative;
    width: 100%;
    z-index: ${euiTheme.levels.content};

    display: flex;
    flex-direction: column;
  `;

const content: EmotionFn = ({ euiTheme }) => css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const topBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  top: 0;
  z-index: ${euiTheme.levels.header};
  height: var(--kbn-application--top-bar-height);
  flex-shrink: 0;
`;

const bottomBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  bottom: 0;
  z-index: ${euiTheme.levels.header};
  height: var(--kbn-application--bottom-bar-height);
  flex-shrink: 0;
`;

export const styles = {
  root,
  content,
  topBar,
  bottomBar,
};
