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
  grid-area: footer;
  background-color: ${euiTheme.colors.backgroundBaseSubdued};
  height: var(--kbnWorkspace--footer-height, 0);
  width: var(--kbnWorkspace--footer-width, 100vw);
  bottom: var(--kbnWorkspace--footer-bottom, 0);
`;

export const styles = {
  root,
};
