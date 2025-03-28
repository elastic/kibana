/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { SerializedStyles } from '@emotion/serialize';
import { UseEuiTheme } from '@elastic/eui';

type EmotionFn = (theme: UseEuiTheme) => SerializedStyles;

const root: EmotionFn = ({ euiTheme: { border } }) => css`
  position: sticky;
  overflow: hidden;
  grid-area: banner;
  height: var(--kbnWorkspace--banner-height, 0);
  width: var(--kbnWorkspace--banner-width, 100vw);
  top: var(--kbnWorkspace--banner-top, 0);
  outline: ${border.thin};
`;

export const styles = {
  root,
};
