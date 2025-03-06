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

const root = css`
  position: sticky;
  overflow: hidden;
  grid-area: tool;
  top: var(--kbnWorkspace--tool-top, 0);
  height: var(--kbnWorkspace--tool-height, 100vh);
  width: var(--kbnWorkspace--tool-width, 0);
  align-self: start;
  display: flex;
`;

const panel: EmotionFn = ({ euiTheme }) =>
  css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: var(--kbnWorkspace--tool-width, 0);

    .euiFlyoutFooter {
      border-bottom-right-radius: ${euiTheme.border.radius.small};
      border-bottom-left-radius: ${euiTheme.border.radius.small};
    }
  `;

const container = css`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const header: EmotionFn = ({ euiTheme, colorMode }) => css`
  padding: ${euiTheme.size.s};
  border-bottom: 1px solid
    ${colorMode === 'LIGHT' ? euiTheme.colors.borderBaseSubdued : euiTheme.colors.borderBasePlain};
  flex-grow: 0;
`;

export const styles = {
  root,
  panel,
  container,
  header,
};
