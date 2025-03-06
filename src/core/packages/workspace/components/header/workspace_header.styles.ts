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
  grid-area: header;
  top: var(--kbnWorkspace--header-top, 0);
  height: var(--kbnWorkspace--header-height, 100vh);
  width: var(--kbnWorkspace--header-width, 100vw);

  .header__actionMenu {
    padding-right: 0;
  }
`;

const section: EmotionFn = ({ euiTheme }) => css`
  margin: 0 ${euiTheme.size.s};
`;

export const styles = {
  root,
  section,
};
