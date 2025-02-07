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
  overflow: hidden;
  grid-area: toolbox;
  top: var(--kbnWorkspace--toolbox-top, 0);
  height: var(--kbnWorkspace--toolbox-height, 100vh);
  width: var(--kbnWorkspace--toolbox-width, 0);
  align-self: start;
  display: flex;
  gap: 12px;
  flex-direction: column;
  padding: 8px 0;
  align-items: center;
`;

export const styles = {
  root,
};
