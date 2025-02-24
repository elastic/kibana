/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui';
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

const panel: EmotionFn = ({ euiTheme }) => css`
  margin: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.s} 0;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const container = ({ euiTheme }: UseEuiTheme, scrolling: string) => css`
  padding: ${euiTheme.size.s};
  overflow-y: scroll;
  flex-grow: 1;
  ${scrolling};
`;

const header: EmotionFn = ({ euiTheme }) => css`
  padding: ${euiTheme.size.s};
  border-bottom: ${euiTheme.border.thin};
  flex-grow: 0;
`;

export const styles = {
  root,
  panel,
  container,
  header,
};
