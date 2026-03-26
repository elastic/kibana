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
import type { EmotionFn } from '../types';

const root: EmotionFn = ({ euiTheme }) => css`
  grid-area: banner;
  position: sticky;
  width: ${layoutVar('banner.width')};
  height: ${layoutVar('banner.height')};
  z-index: ${layoutLevels.banner};
`;

export const styles = {
  root,
};
